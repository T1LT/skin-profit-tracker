import { getDb } from '../db/database'
import { average, computeTradeProfit, median, roundMoney, type TradeProfit } from '../../shared/calculations'
import type {
  MarketplaceStat,
  NamedCount,
  NamedProfit,
  RoiBucket,
  Statistics,
  TradeExtreme,
  WeaponStat,
} from '../../shared/models'

interface LeanRow {
  id: number
  skin_name: string
  weapon: string
  finish: string
  status: string
  purchase_price_inr: number | null
  purchase_date: string | null
  sale_source: string | null
  sale_price_inr: number | null
  sale_fee_percentage: number | null
  sale_date: string | null
}

function displayName(row: LeanRow): string {
  if (row.skin_name && row.skin_name.trim()) return row.skin_name
  return `${row.weapon}${row.finish ? ` | ${row.finish}` : ''}`
}

const ROI_BUCKETS: { label: string; test: (roi: number) => boolean }[] = [
  { label: '< -25%', test: (r) => r < -25 },
  { label: '-25–0%', test: (r) => r >= -25 && r < 0 },
  { label: '0–25%', test: (r) => r >= 0 && r < 25 },
  { label: '25–50%', test: (r) => r >= 25 && r < 50 },
  { label: '50–100%', test: (r) => r >= 50 && r < 100 },
  { label: '100%+', test: (r) => r >= 100 },
]

/** Pick the entry with the highest value from a Map. */
function topBy<T>(map: Map<string, T>, valueOf: (v: T) => number): { key: string; value: T } | null {
  let best: { key: string; value: T } | null = null
  for (const [key, value] of map) {
    if (!best || valueOf(value) > valueOf(best.value)) best = { key, value }
  }
  return best
}

export function getStatistics(): Statistics {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, skin_name, weapon, finish, status, purchase_price_inr, purchase_date,
              sale_source, sale_price_inr, sale_fee_percentage, sale_date
       FROM skins`,
    )
    .all() as LeanRow[]

  const sold = rows.filter((r) => r.status === 'sold' && r.sale_price_inr != null)

  const pnl = new Map<number, TradeProfit>()
  for (const r of sold) {
    pnl.set(
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

  const rois = sold.map((r) => pnl.get(r.id)!.roi)
  const wins = sold.filter((r) => pnl.get(r.id)!.profitInr > 0).length
  const losses = sold.filter((r) => pnl.get(r.id)!.profitInr < 0).length

  const totalRealizedProfit = sold.reduce((s, r) => s + pnl.get(r.id)!.profitInr, 0)
  const totalInvested = sold.reduce((s, r) => s + (r.purchase_price_inr ?? 0), 0)

  /* --- most-traded weapon (across all items) --- */
  const weaponCounts = new Map<string, number>()
  for (const r of rows) weaponCounts.set(r.weapon, (weaponCounts.get(r.weapon) ?? 0) + 1)
  const mostTradedTop = topBy(weaponCounts, (v) => v)
  const mostTradedWeapon: NamedCount | null = mostTradedTop
    ? { name: mostTradedTop.key, count: mostTradedTop.value }
    : null

  /* --- profit by weapon / finish / marketplace (sold only) --- */
  const weaponAgg = new Map<string, { profit: number; cost: number; trades: number }>()
  const finishAgg = new Map<string, number>()
  const marketAgg = new Map<string, { profit: number; net: number; cost: number; trades: number }>()

  for (const r of sold) {
    const p = pnl.get(r.id)!
    const w = weaponAgg.get(r.weapon) ?? { profit: 0, cost: 0, trades: 0 }
    w.profit += p.profitInr
    w.cost += r.purchase_price_inr ?? 0
    w.trades += 1
    weaponAgg.set(r.weapon, w)

    if (r.finish) finishAgg.set(r.finish, (finishAgg.get(r.finish) ?? 0) + p.profitInr)

    const key = r.sale_source ?? 'Other'
    const m = marketAgg.get(key) ?? { profit: 0, net: 0, cost: 0, trades: 0 }
    m.profit += p.profitInr
    m.net += p.netSaleInr
    m.cost += r.purchase_price_inr ?? 0
    m.trades += 1
    marketAgg.set(key, m)
  }

  const mostProfitableWeaponTop = topBy(weaponAgg, (v) => v.profit)
  const mostProfitableWeapon: NamedProfit | null =
    mostProfitableWeaponTop && mostProfitableWeaponTop.value.profit !== 0
      ? { name: mostProfitableWeaponTop.key, profit: roundMoney(mostProfitableWeaponTop.value.profit) }
      : null

  const mostProfitableFinishTop = topBy(finishAgg, (v) => v)
  const mostProfitableFinish: NamedProfit | null =
    mostProfitableFinishTop && mostProfitableFinishTop.value !== 0
      ? { name: mostProfitableFinishTop.key, profit: roundMoney(mostProfitableFinishTop.value) }
      : null

  const profitByMarketplace: MarketplaceStat[] = [...marketAgg.entries()]
    .map(([source, v]) => ({
      source,
      trades: v.trades,
      profit: roundMoney(v.profit),
      net: roundMoney(v.net),
      roi: v.cost > 0 ? (v.profit / v.cost) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit)

  const topWeapons: WeaponStat[] = [...weaponAgg.entries()]
    .map(([weapon, v]) => ({
      weapon,
      trades: v.trades,
      profit: roundMoney(v.profit),
      roi: v.cost > 0 ? (v.profit / v.cost) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8)

  /* --- best / worst trade --- */
  let bestTrade: TradeExtreme | null = null
  let worstTrade: TradeExtreme | null = null
  for (const r of sold) {
    const p = pnl.get(r.id)!
    const extreme: TradeExtreme = {
      id: r.id,
      name: displayName(r),
      weapon: r.weapon,
      finish: r.finish,
      profit: p.profitInr,
      roi: p.roi,
    }
    if (!bestTrade || p.profitInr > bestTrade.profit) bestTrade = extreme
    if (!worstTrade || p.profitInr < worstTrade.profit) worstTrade = extreme
  }
  if (worstTrade && worstTrade.profit >= 0) worstTrade = null

  /* --- ROI distribution histogram --- */
  const roiDistribution: RoiBucket[] = ROI_BUCKETS.map((b) => ({
    label: b.label,
    count: rois.filter((r) => b.test(r)).length,
  }))

  return {
    totalTrades: sold.length,
    totalItems: rows.length,
    wins,
    losses,
    winRate: sold.length > 0 ? (wins / sold.length) * 100 : 0,
    averageRoi: average(rois),
    medianRoi: median(rois),
    averageHoldingDays: average(sold.map((r) => pnl.get(r.id)!.holdingDays)),
    averageFeesPaid: roundMoney(average(sold.map((r) => pnl.get(r.id)!.feeInr))),
    totalRealizedProfit: roundMoney(totalRealizedProfit),
    totalInvested: roundMoney(totalInvested),
    mostTradedWeapon,
    mostProfitableWeapon,
    mostProfitableFinish,
    bestTrade,
    worstTrade,
    profitByMarketplace,
    topWeapons,
    roiDistribution,
  }
}
