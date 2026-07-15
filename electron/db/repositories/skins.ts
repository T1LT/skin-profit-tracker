import { getDb } from '../database'
import { settingsRepo } from './settings'
import { roundMoney } from '../../../shared/calculations'
import type {
  CreateSkinInput,
  ListSkinInput,
  PagedResult,
  SellSkinInput,
  Skin,
  SkinFilter,
  UpdateSkinInput,
} from '../../../shared/models'

/** Raw row shape as it comes back from SQLite (booleans are 0/1, tags is JSON text). */
interface SkinRow {
  [key: string]: unknown
  id: number
  stattrak: number
  souvenir: number
  favorite: number
  pinned: number
  wishlist: number
  tags: string
}

/**
 * Every writable column. This doubles as the whitelist in `update()` — a column
 * missing here is silently dropped from every patch, so keep it in sync with the
 * schema.
 */
const INSERT_COLUMNS = [
  'skin_name',
  'weapon',
  'finish',
  'wear',
  'float_value',
  'pattern',
  'stattrak',
  'souvenir',
  'purchase_source',
  'purchase_currency',
  'purchase_price_usd',
  'purchase_price_inr',
  'purchase_price_empire',
  'purchase_exchange_rate',
  'purchase_empire_rate',
  'purchase_date',
  'list_source',
  'list_currency',
  'list_price_usd',
  'list_price_inr',
  'list_price_empire',
  'list_exchange_rate',
  'list_empire_rate',
  'list_fee_percentage',
  'list_date',
  'sale_source',
  'sale_currency',
  'sale_price_usd',
  'sale_price_inr',
  'sale_price_empire',
  'sale_exchange_rate',
  'sale_empire_rate',
  'sale_fee_percentage',
  'sale_date',
  'status',
  'notes',
  'favorite',
  'pinned',
  'wishlist',
  'tags',
  'category',
  'created_at',
  'updated_at',
] as const

const BOOLEAN_COLUMNS = new Set(['stattrak', 'souvenir', 'favorite', 'pinned', 'wishlist'])

const SORTABLE = new Set<string>([
  'skin_name',
  'weapon',
  'finish',
  'wear',
  'float_value',
  'pattern',
  'purchase_source',
  'purchase_price_usd',
  'purchase_price_inr',
  'purchase_price_empire',
  'purchase_date',
  'list_source',
  'list_price_inr',
  'list_date',
  'sale_source',
  'sale_price_inr',
  'sale_fee_percentage',
  'sale_date',
  'status',
  'created_at',
  'updated_at',
])

/** SQL expression for realised profit (INR) on a closed trade; NULL-safe. */
const PROFIT_EXPR = `(COALESCE(sale_price_inr, 0) * (1 - COALESCE(sale_fee_percentage, 0) / 100.0) - COALESCE(purchase_price_inr, 0))`

/**
 * Purchase price in Empire coins. Skins bought with coins have it stored; everything
 * else is converted from INR at the rate frozen on the row, falling back to the live
 * setting (@__coin) — so the column sorts by the same value the table displays.
 */
const EMPIRE_EXPR = `COALESCE(purchase_price_empire,
  purchase_price_inr / NULLIF(COALESCE(purchase_empire_rate, @__coin), 0))`

/** Every listing field, blanked. Spread into a patch to take a skin off the market. */
const CLEAR_LIST_FIELDS = {
  list_source: null,
  list_currency: null,
  list_price_usd: null,
  list_price_inr: null,
  list_price_empire: null,
  list_exchange_rate: null,
  list_empire_rate: null,
  list_fee_percentage: null,
  list_date: null,
} satisfies UpdateSkinInput

/** Every sale field, blanked. */
const CLEAR_SALE_FIELDS = {
  sale_source: null,
  sale_currency: null,
  sale_price_usd: null,
  sale_price_inr: null,
  sale_price_empire: null,
  sale_exchange_rate: null,
  sale_empire_rate: null,
  sale_fee_percentage: null,
  sale_date: null,
} satisfies UpdateSkinInput

function rowToSkin(row: SkinRow): Skin {
  return {
    ...(row as unknown as Skin),
    stattrak: !!row.stattrak,
    souvenir: !!row.souvenir,
    favorite: !!row.favorite,
    pinned: !!row.pinned,
    wishlist: !!row.wishlist,
    tags: parseTags(row.tags),
  }
}

function parseTags(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function buildInsertParams(skin: Partial<Skin>): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const col of INSERT_COLUMNS) {
    let value = (skin as Record<string, unknown>)[col]
    if (BOOLEAN_COLUMNS.has(col)) value = value ? 1 : 0
    else if (col === 'tags') value = JSON.stringify(Array.isArray(value) ? value : [])
    else if (value === undefined) value = null
    params[col] = value
  }
  return params
}

const INSERT_SQL = `INSERT INTO skins (${INSERT_COLUMNS.join(', ')})
  VALUES (${INSERT_COLUMNS.map((c) => '@' + c).join(', ')})`

export const skinsRepo = {
  list(filter: SkinFilter = {}): PagedResult<Skin> {
    const db = getDb()
    const where: string[] = []
    const params: Record<string, unknown> = {}

    if (filter.status && filter.status !== 'all') {
      where.push('status = @status')
      params.status = filter.status
    }
    if (filter.purchaseSource && filter.purchaseSource !== 'all') {
      where.push('purchase_source = @psource')
      params.psource = filter.purchaseSource
    }
    if (filter.saleSource && filter.saleSource !== 'all') {
      where.push('sale_source = @ssource')
      params.ssource = filter.saleSource
    }
    if (filter.favorite) where.push('favorite = 1')
    if (filter.pinned) where.push('pinned = 1')
    if (filter.wishlist) where.push('wishlist = 1')
    if (filter.dateFrom) {
      where.push('purchase_date >= @dateFrom')
      params.dateFrom = filter.dateFrom
    }
    if (filter.dateTo) {
      where.push('purchase_date <= @dateTo')
      params.dateTo = filter.dateTo
    }
    if (filter.priceMin != null) {
      where.push('purchase_price_inr >= @priceMin')
      params.priceMin = filter.priceMin
    }
    if (filter.priceMax != null) {
      where.push('purchase_price_inr <= @priceMax')
      params.priceMax = filter.priceMax
    }
    if (filter.search && filter.search.trim()) {
      where.push(
        `(skin_name LIKE @q OR weapon LIKE @q OR finish LIKE @q OR wear LIKE @q OR notes LIKE @q
          OR purchase_source LIKE @q OR sale_source LIKE @q OR CAST(pattern AS TEXT) LIKE @q)`,
      )
      params.q = `%${filter.search.trim()}%`
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM skins ${whereSql}`).get(params) as { c: number }
    ).c

    let orderCol = 'created_at'
    let byEmpire = false
    if (filter.sortBy === 'profit') orderCol = PROFIT_EXPR
    else if (filter.sortBy === 'purchase_price_empire') {
      orderCol = EMPIRE_EXPR
      byEmpire = true
    } else if (filter.sortBy && SORTABLE.has(filter.sortBy)) orderCol = filter.sortBy
    const dir = filter.sortDir === 'asc' ? 'ASC' : 'DESC'

    const limit = filter.limit ?? 1_000_000
    const offset = filter.offset ?? 0

    // better-sqlite3 rejects a named param the statement doesn't reference, so @__coin
    // is only bound when EMPIRE_EXPR is actually in the ORDER BY.
    const rowParams: Record<string, unknown> = { ...params, __limit: limit, __offset: offset }
    if (byEmpire) rowParams.__coin = settingsRepo.get().empire_coin_inr

    const rows = db
      .prepare(
        `SELECT * FROM skins ${whereSql}
         ORDER BY pinned DESC, ${orderCol} ${dir}, id DESC
         LIMIT @__limit OFFSET @__offset`,
      )
      .all(rowParams) as SkinRow[]

    return { rows: rows.map(rowToSkin), total }
  },

  all(): Skin[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM skins ORDER BY id ASC').all() as SkinRow[]
    return rows.map(rowToSkin)
  },

  getById(id: number): Skin | null {
    const row = getDb().prepare('SELECT * FROM skins WHERE id = ?').get(id) as SkinRow | undefined
    return row ? rowToSkin(row) : null
  },

  count(): number {
    return (getDb().prepare('SELECT COUNT(*) AS c FROM skins').get() as { c: number }).c
  },

  create(input: CreateSkinInput): Skin {
    const db = getDb()
    const now = new Date().toISOString()

    let inr = input.purchase_price_inr ?? null
    if (
      inr == null &&
      input.purchase_price_usd != null &&
      input.purchase_exchange_rate != null
    ) {
      inr = roundMoney(input.purchase_price_usd * input.purchase_exchange_rate)
    }

    const params = buildInsertParams({
      ...input,
      purchase_price_inr: inr,
      wear: input.wear ?? null,
      finish: input.finish ?? '',
      ...CLEAR_LIST_FIELDS,
      ...CLEAR_SALE_FIELDS,
      status: 'owned',
      created_at: now,
      updated_at: now,
    })

    const info = db.prepare(INSERT_SQL).run(params)
    return this.getById(Number(info.lastInsertRowid))!
  },

  /** Insert a complete skin record (used by undo-delete and JSON import). */
  insertFull(skin: Skin, keepId = false): Skin {
    const db = getDb()
    if (keepId && !this.getById(skin.id)) {
      const cols = ['id', ...INSERT_COLUMNS]
      const sql = `INSERT INTO skins (${cols.join(', ')}) VALUES (${cols
        .map((c) => '@' + c)
        .join(', ')})`
      const info = db.prepare(sql).run({ id: skin.id, ...buildInsertParams(skin) })
      return this.getById(Number(info.lastInsertRowid))!
    }
    const info = db.prepare(INSERT_SQL).run(buildInsertParams(skin))
    return this.getById(Number(info.lastInsertRowid))!
  },

  update(id: number, patch: UpdateSkinInput): Skin | null {
    const db = getDb()
    const fields: string[] = []
    const params: Record<string, unknown> = { id }

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'id' || key === 'created_at') continue
      if (!INSERT_COLUMNS.includes(key as (typeof INSERT_COLUMNS)[number])) continue
      let v: unknown = value
      if (BOOLEAN_COLUMNS.has(key)) v = value ? 1 : 0
      else if (key === 'tags') v = JSON.stringify(Array.isArray(value) ? value : [])
      fields.push(`${key} = @${key}`)
      params[key] = v === undefined ? null : v
    }

    fields.push('updated_at = @updated_at')
    params.updated_at = new Date().toISOString()

    db.prepare(`UPDATE skins SET ${fields.join(', ')} WHERE id = @id`).run(params)
    return this.getById(id)
  },

  /**
   * Put a skin up for sale on a marketplace. Named `listForSale` rather than `list`
   * because `list` is already this repo's paging query.
   */
  listForSale(id: number, input: ListSkinInput): Skin | null {
    const skin = this.getById(id)
    if (!skin) return null

    let inr = input.list_price_inr ?? null
    if (inr == null && input.list_price_usd != null && input.list_exchange_rate != null) {
      inr = roundMoney(input.list_price_usd * input.list_exchange_rate)
    }

    return this.update(id, {
      list_source: input.list_source,
      list_currency: input.list_currency ?? null,
      list_price_usd: input.list_price_usd ?? null,
      list_price_inr: inr,
      list_price_empire: input.list_price_empire ?? null,
      list_exchange_rate: input.list_exchange_rate ?? null,
      list_empire_rate: input.list_empire_rate ?? null,
      list_fee_percentage: input.list_fee_percentage ?? null,
      list_date: input.list_date,
      status: 'listed',
      notes: input.notes ?? skin.notes,
    })
  },

  /** Pull a listing off the market (clears the listing, status back to owned). */
  unlist(id: number): Skin | null {
    return this.update(id, { ...CLEAR_LIST_FIELDS, status: 'owned' })
  },

  /**
   * Close a trade. Valid from `owned` (sold directly) or `listed` (the listing sold).
   * The `list_*` fields are deliberately left intact — they record what the skin was
   * asked at, which is what makes "sold below ask" answerable later.
   */
  sell(id: number, input: SellSkinInput): Skin | null {
    const skin = this.getById(id)
    if (!skin) return null

    let inr = input.sale_price_inr ?? null
    if (inr == null && input.sale_price_usd != null && input.sale_exchange_rate != null) {
      inr = roundMoney(input.sale_price_usd * input.sale_exchange_rate)
    }

    return this.update(id, {
      sale_source: input.sale_source,
      sale_currency: input.sale_currency ?? null,
      sale_price_usd: input.sale_price_usd ?? null,
      sale_price_inr: inr,
      sale_price_empire: input.sale_price_empire ?? null,
      sale_exchange_rate: input.sale_exchange_rate ?? null,
      sale_empire_rate: input.sale_empire_rate ?? null,
      sale_fee_percentage: input.sale_fee_percentage ?? null,
      sale_date: input.sale_date,
      status: 'sold',
      notes: input.notes ?? skin.notes,
    })
  },

  /** Re-open a sold skin: clears the sale *and* the stale listing, back to owned. */
  reopen(id: number): Skin | null {
    return this.update(id, { ...CLEAR_SALE_FIELDS, ...CLEAR_LIST_FIELDS, status: 'owned' })
  },

  duplicate(id: number): Skin | null {
    const s = this.getById(id)
    if (!s) return null
    return this.create({
      skin_name: s.skin_name,
      weapon: s.weapon,
      finish: s.finish,
      wear: s.wear,
      float_value: s.float_value,
      pattern: s.pattern,
      stattrak: s.stattrak,
      souvenir: s.souvenir,
      purchase_source: s.purchase_source,
      purchase_currency: s.purchase_currency,
      purchase_price_usd: s.purchase_price_usd,
      purchase_price_inr: s.purchase_price_inr,
      purchase_price_empire: s.purchase_price_empire,
      purchase_exchange_rate: s.purchase_exchange_rate,
      purchase_empire_rate: s.purchase_empire_rate,
      purchase_date: s.purchase_date,
      notes: s.notes,
      tags: s.tags,
      category: s.category,
    })
  },

  remove(id: number): boolean {
    return getDb().prepare('DELETE FROM skins WHERE id = ?').run(id).changes > 0
  },

  bulkRemove(ids: number[]): number {
    if (ids.length === 0) return 0
    const db = getDb()
    const stmt = db.prepare('DELETE FROM skins WHERE id = ?')
    const txn = db.transaction((list: number[]) => {
      let removed = 0
      for (const id of list) removed += stmt.run(id).changes
      return removed
    })
    return txn(ids)
  },

  clearAll(): void {
    getDb().exec('DELETE FROM skins; DELETE FROM market_history;')
  },
}
