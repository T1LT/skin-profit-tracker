/**
 * Pure profit / currency calculation helpers. No side effects, no I/O — safe to
 * use in the main process, the renderer, unit tests, or anywhere else.
 *
 * Base currency across the whole app is INR.
 */
import type { Currency } from './models'

/** Default INR value of a single CSGOEmpire coin (adjustable in Settings). */
export const DEFAULT_EMPIRE_COIN_INR = 63

export function clampPercent(pct: number | null | undefined): number {
  if (pct == null || Number.isNaN(pct)) return 0
  return Math.min(100, Math.max(0, pct))
}

/** Round to 2 decimal places, guarding against floating point dust. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function usdToInr(usd: number, exchangeRate: number): number {
  return usd * exchangeRate
}

/** Convert CSGOEmpire coins to INR at a direct coin→INR rate. */
export function empireToInr(coins: number, empireCoinInr = DEFAULT_EMPIRE_COIN_INR): number {
  return coins * empireCoinInr
}

export function feeAmount(gross: number, feePct: number): number {
  return gross * (clampPercent(feePct) / 100)
}

export function netFromGross(gross: number, feePct: number): number {
  return gross - feeAmount(gross, feePct)
}

/** Whole days between two ISO date strings (never negative). */
export function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export interface TradeProfit {
  purchaseInr: number
  grossSaleInr: number
  feeInr: number
  netSaleInr: number
  profitInr: number
  profitPct: number
  roi: number
  holdingDays: number
  isProfit: boolean
}

/**
 * The single source of truth for what "profit" means on a closed trade.
 * Everything (dashboard, statistics, sales page, CSV export) funnels through
 * this so the numbers can never disagree.
 */
export function computeTradeProfit(params: {
  purchaseInr: number
  grossSaleInr: number
  feePct?: number | null
  purchaseDate?: string | null
  saleDate?: string | null
}): TradeProfit {
  const purchaseInr = params.purchaseInr || 0
  const grossSaleInr = params.grossSaleInr || 0
  const feeInr = feeAmount(grossSaleInr, params.feePct ?? 0)
  const netSaleInr = grossSaleInr - feeInr
  const profitInr = netSaleInr - purchaseInr
  const profitPct = purchaseInr > 0 ? (profitInr / purchaseInr) * 100 : 0
  const holdingDays =
    params.purchaseDate && params.saleDate ? daysBetween(params.purchaseDate, params.saleDate) : 0

  return {
    purchaseInr: roundMoney(purchaseInr),
    grossSaleInr: roundMoney(grossSaleInr),
    feeInr: roundMoney(feeInr),
    netSaleInr: roundMoney(netSaleInr),
    profitInr: roundMoney(profitInr),
    profitPct,
    roi: profitPct,
    holdingDays,
    isProfit: profitInr >= 0,
  }
}

/**
 * The lowest gross sale price (before this marketplace's fee) at which a trade
 * breaks even, given a purchase cost and a fee percentage.
 *   net = gross * (1 - fee/100)  =>  gross = cost / (1 - fee/100)
 */
export function breakEvenGross(purchaseInr: number, feePct: number): number {
  const f = clampPercent(feePct) / 100
  if (f >= 1) return Infinity
  return roundMoney(purchaseInr / (1 - f))
}

export interface PriceBreakdown {
  usd: number | null
  inr: number
  empire: number | null
}

/**
 * Resolve a price entered in any currency into the canonical INR value plus the
 * equivalent USD / Empire-coin figures. INR is always populated; the others are
 * filled when meaningful. Used by Purchases, Sales and the Arbitrage calculator.
 */
export function priceBreakdown(
  currency: Currency,
  amount: number,
  exchangeRate: number,
  empireCoinInr = DEFAULT_EMPIRE_COIN_INR,
): PriceBreakdown {
  const amt = amount || 0
  const rate = exchangeRate || 0
  if (currency === 'INR') {
    return { usd: rate > 0 ? roundMoney(amt / rate) : null, inr: roundMoney(amt), empire: null }
  }
  if (currency === 'USD') {
    return { usd: roundMoney(amt), inr: roundMoney(amt * rate), empire: null }
  }
  // EMPIRE coins: 1 coin = empireCoinInr INR. USD is derived from that.
  const inr = amt * empireCoinInr
  return { usd: rate > 0 ? roundMoney(inr / rate) : null, inr: roundMoney(inr), empire: roundMoney(amt) }
}

export interface ArbitrageInput {
  purchaseCurrency: Currency
  purchasePrice: number
  purchaseFeePct: number
  saleCurrency: Currency
  salePrice: number
  saleFeePct: number
  exchangeRate: number
  empireCoinInr?: number
}

export interface ArbitrageResult {
  purchaseInr: number
  purchaseFeeInr: number
  saleGrossInr: number
  saleFeeInr: number
  netSaleInr: number
  profitInr: number
  profitPct: number
  roi: number
  isProfit: boolean
  /** Gross sale price (in each currency) required to break even. */
  breakEvenInr: number
  breakEvenUsd: number
  breakEvenEmpire: number
}

/**
 * The full cross-marketplace arbitrage calculation. Buy in one currency/market,
 * sell in another; everything is normalised to INR. Break-even is the gross sale
 * price (before the sale-side fee) needed to make zero profit, expressed in INR,
 * USD and Empire coins.
 */
export function computeArbitrage(input: ArbitrageInput): ArbitrageResult {
  const coinInr = input.empireCoinInr ?? DEFAULT_EMPIRE_COIN_INR
  const rate = input.exchangeRate || 0

  const baseCostInr = priceBreakdown(input.purchaseCurrency, input.purchasePrice, rate, coinInr).inr
  const purchaseFeeInr = baseCostInr * (clampPercent(input.purchaseFeePct) / 100)
  const purchaseInr = baseCostInr + purchaseFeeInr

  const saleGrossInr = priceBreakdown(input.saleCurrency, input.salePrice, rate, coinInr).inr
  const saleFeeInr = saleGrossInr * (clampPercent(input.saleFeePct) / 100)
  const netSaleInr = saleGrossInr - saleFeeInr

  const profitInr = netSaleInr - purchaseInr
  const profitPct = purchaseInr > 0 ? (profitInr / purchaseInr) * 100 : 0

  const breakEvenInr = breakEvenGross(purchaseInr, input.saleFeePct)
  const breakEvenUsd = rate > 0 && Number.isFinite(breakEvenInr) ? breakEvenInr / rate : 0
  const breakEvenEmpire =
    coinInr > 0 && Number.isFinite(breakEvenInr) ? breakEvenInr / coinInr : 0

  return {
    purchaseInr: roundMoney(purchaseInr),
    purchaseFeeInr: roundMoney(purchaseFeeInr),
    saleGrossInr: roundMoney(saleGrossInr),
    saleFeeInr: roundMoney(saleFeeInr),
    netSaleInr: roundMoney(netSaleInr),
    profitInr: roundMoney(profitInr),
    profitPct,
    roi: profitPct,
    isProfit: profitInr >= 0,
    breakEvenInr: roundMoney(breakEvenInr),
    breakEvenUsd: roundMoney(breakEvenUsd),
    breakEvenEmpire: roundMoney(breakEvenEmpire),
  }
}

/** Convenience: average of a numeric array (0 for empty). */
export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Median of a numeric array (0 for empty). */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
