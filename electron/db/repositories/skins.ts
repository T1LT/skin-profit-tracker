import { getDb } from '../database'
import { roundMoney } from '../../../shared/calculations'
import type {
  CreateSkinInput,
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
  'purchase_price_usd',
  'purchase_price_inr',
  'purchase_price_empire',
  'purchase_exchange_rate',
  'purchase_date',
  'sale_source',
  'sale_price_usd',
  'sale_price_inr',
  'sale_price_empire',
  'sale_exchange_rate',
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
  'sale_source',
  'sale_price_inr',
  'sale_date',
  'status',
  'created_at',
  'updated_at',
])

/** SQL expression for realised profit (INR) on a closed trade; NULL-safe. */
const PROFIT_EXPR = `(COALESCE(sale_price_inr, 0) * (1 - COALESCE(sale_fee_percentage, 0) / 100.0) - COALESCE(purchase_price_inr, 0))`

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
    if (filter.sortBy === 'profit') orderCol = PROFIT_EXPR
    else if (filter.sortBy && SORTABLE.has(filter.sortBy)) orderCol = filter.sortBy
    const dir = filter.sortDir === 'asc' ? 'ASC' : 'DESC'

    const limit = filter.limit ?? 1_000_000
    const offset = filter.offset ?? 0

    const rows = db
      .prepare(
        `SELECT * FROM skins ${whereSql}
         ORDER BY pinned DESC, ${orderCol} ${dir}, id DESC
         LIMIT @__limit OFFSET @__offset`,
      )
      .all({ ...params, __limit: limit, __offset: offset }) as SkinRow[]

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
      sale_source: null,
      sale_price_usd: null,
      sale_price_inr: null,
      sale_price_empire: null,
      sale_exchange_rate: null,
      sale_fee_percentage: null,
      sale_date: null,
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

  sell(id: number, input: SellSkinInput): Skin | null {
    const skin = this.getById(id)
    if (!skin) return null

    let inr = input.sale_price_inr ?? null
    if (inr == null && input.sale_price_usd != null && input.sale_exchange_rate != null) {
      inr = roundMoney(input.sale_price_usd * input.sale_exchange_rate)
    }

    return this.update(id, {
      sale_source: input.sale_source,
      sale_price_usd: input.sale_price_usd ?? null,
      sale_price_inr: inr,
      sale_price_empire: input.sale_price_empire ?? null,
      sale_exchange_rate: input.sale_exchange_rate ?? null,
      sale_fee_percentage: input.sale_fee_percentage ?? null,
      sale_date: input.sale_date,
      status: 'sold',
      notes: input.notes ?? skin.notes,
    })
  },

  /** Re-open a sold skin (clears all sale fields, status back to owned). */
  reopen(id: number): Skin | null {
    return this.update(id, {
      sale_source: null,
      sale_price_usd: null,
      sale_price_inr: null,
      sale_price_empire: null,
      sale_exchange_rate: null,
      sale_fee_percentage: null,
      sale_date: null,
      status: 'owned',
    })
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
      purchase_price_usd: s.purchase_price_usd,
      purchase_price_inr: s.purchase_price_inr,
      purchase_price_empire: s.purchase_price_empire,
      purchase_exchange_rate: s.purchase_exchange_rate,
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
