import { getDb } from '../db/database'
import { marketHistoryRepo } from '../db/repositories/marketHistory'
import { withdrawalsRepo } from '../db/repositories/withdrawals'
import { average, computeTradeProfit, roundMoney, type TradeProfit } from '../../shared/calculations'
import type {
  DashboardStats,
  MonthlyPoint,
  RecentSkin,
  SourceSlice,
  TimelinePoint,
  TopSkin,
} from '../../shared/models'

interface LeanRow {
  id: number
  skin_name: string
  weapon: string
  finish: string
  wear: string | null
  stattrak: number
  souvenir: number
  status: string
  purchase_source: string
  purchase_price_inr: number | null
  purchase_date: string | null
  sale_source: string | null
  sale_price_inr: number | null
  sale_fee_percentage: number | null
  sale_date: string | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(date: string): string {
  return date.slice(0, 7) // YYYY-MM
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const idx = Number(month) - 1
  return `${MONTHS[idx] ?? '?'} ${year.slice(2)}`
}

/** Every month between the earliest and latest key, inclusive, so charts are continuous. */
function fillMonths(keys: string[]): string[] {
  if (keys.length === 0) return []
  const sorted = [...new Set(keys)].sort()
  const [startY, startM] = sorted[0].split('-').map(Number)
  const [endY, endM] = sorted[sorted.length - 1].split('-').map(Number)
  const out: string[] = []
  let y = startY
  let m = startM
  // Guard against pathological ranges (max 240 months / 20 years).
  for (let guard = 0; guard < 240; guard++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    if (y === endY && m === endM) break
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

function displayName(row: LeanRow): string {
  if (row.skin_name && row.skin_name.trim()) return row.skin_name
  const st = row.stattrak ? 'StatTrak™ ' : ''
  return `${st}${row.weapon}${row.finish ? ` | ${row.finish}` : ''}`
}

export function getDashboardStats(): DashboardStats {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, skin_name, weapon, finish, wear, stattrak, souvenir, status,
              purchase_source, purchase_price_inr, purchase_date,
              sale_source, sale_price_inr, sale_fee_percentage, sale_date
       FROM skins`,
    )
    .all() as LeanRow[]

  const latestMarket = marketHistoryRepo.latestPriceMap()

  const owned = rows.filter((r) => r.status === 'owned')
  const sold = rows.filter((r) => r.status === 'sold' && r.sale_price_inr != null)

  const profitByRow = new Map<number, TradeProfit>()
  for (const r of sold) {
    profitByRow.set(
      r.id,
      computeTradeProfit({
        purchaseInr: r.purchase_price_inr ?? 0,
        grossSaleInr: r.sale_price_inr ?? 0,
        feePct: r.sale_fee_percentage,
        purchaseDate: r.purchase_date,
        saleDate: r.sale_date,
      }),
    )
  }

  /* --- headline totals ------------------------------------------------- */
  const totalPurchaseCost = rows.reduce((s, r) => s + (r.purchase_price_inr ?? 0), 0)
  const ownedCostBasis = owned.reduce((s, r) => s + (r.purchase_price_inr ?? 0), 0)
  const soldPurchaseCost = sold.reduce((s, r) => s + (r.purchase_price_inr ?? 0), 0)

  const totalInventoryValue = owned.reduce(
    (s, r) => s + (latestMarket.get(r.id) ?? r.purchase_price_inr ?? 0),
    0,
  )
  const unrealizedProfit = totalInventoryValue - ownedCostBasis

  const totalSoldValue = sold.reduce((s, r) => s + (r.sale_price_inr ?? 0), 0)
  const realizedProfit = sold.reduce((s, r) => s + (profitByRow.get(r.id)?.profitInr ?? 0), 0)
  const totalFeesPaid = sold.reduce((s, r) => s + (profitByRow.get(r.id)?.feeInr ?? 0), 0)
  const overallRoi = soldPurchaseCost > 0 ? (realizedProfit / soldPurchaseCost) * 100 : 0

  // Available balance = realized profit minus cash already withdrawn.
  const totalWithdrawn = withdrawalsRepo.total()
  const availableBalance = realizedProfit - totalWithdrawn

  const avgHoldingDays = average(sold.map((r) => profitByRow.get(r.id)?.holdingDays ?? 0))
  const avgPurchasePrice = average(
    rows.filter((r) => r.purchase_price_inr != null).map((r) => r.purchase_price_inr as number),
  )
  const avgSalePrice = average(sold.map((r) => r.sale_price_inr as number))

  /* --- best / worst trade --------------------------------------------- */
  let highestProfit: DashboardStats['highestProfit'] = null
  let biggestLoss: DashboardStats['biggestLoss'] = null
  for (const r of sold) {
    const p = profitByRow.get(r.id)!
    const extreme = {
      id: r.id,
      name: displayName(r),
      weapon: r.weapon,
      finish: r.finish,
      profit: p.profitInr,
      roi: p.roi,
    }
    if (!highestProfit || p.profitInr > highestProfit.profit) highestProfit = extreme
    if (!biggestLoss || p.profitInr < biggestLoss.profit) biggestLoss = extreme
  }
  if (biggestLoss && biggestLoss.profit >= 0) biggestLoss = null // no losses recorded

  /* --- monthly buckets ------------------------------------------------- */
  const monthMap = new Map<string, MonthlyPoint>()
  const ensureMonth = (key: string): MonthlyPoint => {
    let m = monthMap.get(key)
    if (!m) {
      m = { month: key, label: monthLabel(key), purchases: 0, sales: 0, profit: 0, purchaseCount: 0, saleCount: 0 }
      monthMap.set(key, m)
    }
    return m
  }
  for (const r of rows) {
    if (r.purchase_date && r.purchase_price_inr != null) {
      const m = ensureMonth(monthKey(r.purchase_date))
      m.purchases += r.purchase_price_inr
      m.purchaseCount += 1
    }
  }
  for (const r of sold) {
    if (!r.sale_date) continue
    const m = ensureMonth(monthKey(r.sale_date))
    m.sales += r.sale_price_inr ?? 0
    m.profit += profitByRow.get(r.id)?.profitInr ?? 0
    m.saleCount += 1
  }
  const monthly: MonthlyPoint[] = fillMonths([...monthMap.keys()]).map((key) => {
    const m = ensureMonth(key)
    return {
      ...m,
      purchases: roundMoney(m.purchases),
      sales: roundMoney(m.sales),
      profit: roundMoney(m.profit),
    }
  })

  /* --- cumulative profit timeline ------------------------------------- */
  const profitTimeline: TimelinePoint[] = []
  let running = 0
  for (const r of [...sold].sort((a, b) => (a.sale_date ?? '').localeCompare(b.sale_date ?? ''))) {
    running += profitByRow.get(r.id)?.profitInr ?? 0
    profitTimeline.push({ date: (r.sale_date ?? '').slice(0, 10), cumulativeProfit: roundMoney(running) })
  }

  /* --- source distributions ------------------------------------------- */
  const purchaseSources = aggregateSources(
    rows.filter((r) => r.purchase_price_inr != null),
    (r) => r.purchase_source,
    (r) => r.purchase_price_inr ?? 0,
  )
  const saleSources = aggregateSources(
    sold,
    (r) => r.sale_source ?? 'Other',
    (r) => profitByRow.get(r.id)?.netSaleInr ?? 0,
  )

  /* --- top profitable + recent lists ---------------------------------- */
  const topProfitable: TopSkin[] = [...sold]
    .sort((a, b) => (profitByRow.get(b.id)?.profitInr ?? 0) - (profitByRow.get(a.id)?.profitInr ?? 0))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      name: displayName(r),
      weapon: r.weapon,
      finish: r.finish,
      wear: (r.wear as TopSkin['wear']) ?? null,
      stattrak: !!r.stattrak,
      profit: profitByRow.get(r.id)?.profitInr ?? 0,
      roi: profitByRow.get(r.id)?.roi ?? 0,
    }))

  const recentPurchases: RecentSkin[] = [...rows]
    .sort((a, b) => (b.purchase_date ?? '').localeCompare(a.purchase_date ?? '') || b.id - a.id)
    .slice(0, 8)
    .map((r) => toRecent(r, r.purchase_source, r.purchase_price_inr ?? 0, r.purchase_date ?? ''))

  const recentSales: RecentSkin[] = [...sold]
    .sort((a, b) => (b.sale_date ?? '').localeCompare(a.sale_date ?? '') || b.id - a.id)
    .slice(0, 8)
    .map((r) => toRecent(r, r.sale_source ?? 'Other', r.sale_price_inr ?? 0, r.sale_date ?? ''))

  return {
    totalInventoryValue: roundMoney(totalInventoryValue),
    totalPurchaseCost: roundMoney(totalPurchaseCost),
    totalSoldValue: roundMoney(totalSoldValue),
    realizedProfit: roundMoney(realizedProfit),
    totalWithdrawn: roundMoney(totalWithdrawn),
    availableBalance: roundMoney(availableBalance),
    unrealizedProfit: roundMoney(unrealizedProfit),
    overallRoi,
    ownedCount: owned.length,
    soldCount: sold.length,
    avgHoldingDays,
    avgPurchasePrice: roundMoney(avgPurchasePrice),
    avgSalePrice: roundMoney(avgSalePrice),
    totalFeesPaid: roundMoney(totalFeesPaid),
    highestProfit,
    biggestLoss,
    monthly,
    profitTimeline,
    purchaseSources,
    saleSources,
    topProfitable,
    recentPurchases,
    recentSales,
  }
}

function aggregateSources(
  rows: LeanRow[],
  keyOf: (r: LeanRow) => string,
  valueOf: (r: LeanRow) => number,
): SourceSlice[] {
  const map = new Map<string, SourceSlice>()
  for (const r of rows) {
    const key = keyOf(r) || 'Other'
    let slice = map.get(key)
    if (!slice) {
      slice = { source: key, value: 0, count: 0 }
      map.set(key, slice)
    }
    slice.value += valueOf(r)
    slice.count += 1
  }
  return [...map.values()]
    .map((s) => ({ ...s, value: roundMoney(s.value) }))
    .sort((a, b) => b.value - a.value)
}

function toRecent(row: LeanRow, source: string, price: number, date: string): RecentSkin {
  return {
    id: row.id,
    name: displayName(row),
    weapon: row.weapon,
    finish: row.finish,
    wear: (row.wear as RecentSkin['wear']) ?? null,
    stattrak: !!row.stattrak,
    souvenir: !!row.souvenir,
    price: roundMoney(price),
    date,
    source,
  }
}
