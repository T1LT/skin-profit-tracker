import { skinsRepo } from '../db/repositories/skins'
import { getStatistics } from './statistics'
import { computeTradeProfit } from '../../shared/calculations'
import { rowsToCsv } from '../../shared/csv'
import type { CsvKind, Skin } from '../../shared/models'

const dateOnly = (iso: string | null): string => (iso ? iso.slice(0, 10) : '')
const yn = (b: boolean): string => (b ? 'Yes' : 'No')

function pnlOf(s: Skin) {
  return computeTradeProfit({
    purchaseInr: s.purchase_price_inr ?? 0,
    grossSaleInr: s.sale_price_inr ?? 0,
    feePct: s.sale_fee_percentage,
    purchaseDate: s.purchase_date,
    saleDate: s.sale_date,
  })
}

function inventoryCsv(): string {
  const header = [
    'Status', 'Weapon', 'Finish', 'Wear', 'Float', 'Pattern', 'StatTrak', 'Souvenir', 'Category',
    'Purchase Source', 'Purchase USD', 'Purchase INR', 'Purchase Empire', 'Purchase Rate', 'Purchase Date',
    'Sale Source', 'Sale USD', 'Sale INR', 'Sale Empire', 'Sale Fee %', 'Sale Date', 'Favorite', 'Tags', 'Notes',
  ]
  const rows = skinsRepo.all().map((s) => [
    s.status, s.weapon, s.finish, s.wear ?? '', s.float_value ?? '', s.pattern ?? '',
    yn(s.stattrak), yn(s.souvenir), s.category ?? '',
    s.purchase_source, s.purchase_price_usd ?? '', s.purchase_price_inr ?? '', s.purchase_price_empire ?? '',
    s.purchase_exchange_rate ?? '', dateOnly(s.purchase_date),
    s.sale_source ?? '', s.sale_price_usd ?? '', s.sale_price_inr ?? '', s.sale_price_empire ?? '',
    s.sale_fee_percentage ?? '', dateOnly(s.sale_date), yn(s.favorite), s.tags.join('; '), s.notes ?? '',
  ])
  return rowsToCsv([header, ...rows])
}

function purchasesCsv(): string {
  const header = [
    'Weapon', 'Finish', 'Wear', 'Float', 'Pattern', 'StatTrak', 'Souvenir',
    'Source', 'USD', 'INR', 'Empire', 'Exchange Rate', 'Purchase Date', 'Notes',
  ]
  const rows = skinsRepo.all().map((s) => [
    s.weapon, s.finish, s.wear ?? '', s.float_value ?? '', s.pattern ?? '', yn(s.stattrak), yn(s.souvenir),
    s.purchase_source, s.purchase_price_usd ?? '', s.purchase_price_inr ?? '', s.purchase_price_empire ?? '',
    s.purchase_exchange_rate ?? '', dateOnly(s.purchase_date), s.notes ?? '',
  ])
  return rowsToCsv([header, ...rows])
}

function salesCsv(): string {
  const header = [
    'Weapon', 'Finish', 'Wear', 'Sale Source', 'Sale USD', 'Sale INR', 'Fee %', 'Sale Date',
    'Purchase INR', 'Profit INR', 'ROI %', 'Holding Days',
  ]
  const rows = skinsRepo
    .all()
    .filter((s) => s.status === 'sold')
    .map((s) => {
      const p = pnlOf(s)
      return [
        s.weapon, s.finish, s.wear ?? '', s.sale_source ?? '', s.sale_price_usd ?? '', s.sale_price_inr ?? '',
        s.sale_fee_percentage ?? '', dateOnly(s.sale_date),
        s.purchase_price_inr ?? '', p.profitInr, p.roi.toFixed(2), p.holdingDays,
      ]
    })
  return rowsToCsv([header, ...rows])
}

function profitCsv(): string {
  const header = [
    'Weapon', 'Finish', 'Wear', 'Purchase Source', 'Purchase INR', 'Sale Source', 'Gross INR', 'Fee INR',
    'Net INR', 'Profit INR', 'Profit %', 'ROI %', 'Holding Days', 'Purchase Date', 'Sale Date',
  ]
  const rows = skinsRepo
    .all()
    .filter((s) => s.status === 'sold')
    .map((s) => {
      const p = pnlOf(s)
      return [
        s.weapon, s.finish, s.wear ?? '', s.purchase_source, p.purchaseInr, s.sale_source ?? '',
        p.grossSaleInr, p.feeInr, p.netSaleInr, p.profitInr, p.profitPct.toFixed(2), p.roi.toFixed(2),
        p.holdingDays, dateOnly(s.purchase_date), dateOnly(s.sale_date),
      ]
    })
  return rowsToCsv([header, ...rows])
}

function statisticsCsv(): string {
  const s = getStatistics()
  const rows: unknown[][] = [
    ['Metric', 'Value'],
    ['Total items', s.totalItems],
    ['Total trades (sold)', s.totalTrades],
    ['Wins', s.wins],
    ['Losses', s.losses],
    ['Win rate %', s.winRate.toFixed(2)],
    ['Average ROI %', s.averageRoi.toFixed(2)],
    ['Median ROI %', s.medianRoi.toFixed(2)],
    ['Average holding days', s.averageHoldingDays.toFixed(1)],
    ['Average fees paid (INR)', s.averageFeesPaid],
    ['Total realized profit (INR)', s.totalRealizedProfit],
    ['Total invested (INR)', s.totalInvested],
    ['Most traded weapon', s.mostTradedWeapon ? `${s.mostTradedWeapon.name} (${s.mostTradedWeapon.count})` : '—'],
    ['Most profitable weapon', s.mostProfitableWeapon ? `${s.mostProfitableWeapon.name} (${s.mostProfitableWeapon.profit})` : '—'],
    ['Most profitable finish', s.mostProfitableFinish ? `${s.mostProfitableFinish.name} (${s.mostProfitableFinish.profit})` : '—'],
    ['Best trade (INR)', s.bestTrade ? `${s.bestTrade.name}: ${s.bestTrade.profit}` : '—'],
    ['Worst trade (INR)', s.worstTrade ? `${s.worstTrade.name}: ${s.worstTrade.profit}` : '—'],
  ]
  for (const m of s.profitByMarketplace) {
    rows.push([`Profit @ ${m.source} (INR)`, m.profit])
  }
  return rowsToCsv(rows)
}

export function buildCsv(kind: CsvKind): string {
  switch (kind) {
    case 'inventory':
      return inventoryCsv()
    case 'purchases':
      return purchasesCsv()
    case 'sales':
      return salesCsv()
    case 'profit':
      return profitCsv()
    case 'statistics':
      return statisticsCsv()
    default:
      return ''
  }
}
