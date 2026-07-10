import { z } from 'zod'
import { DEFAULT_EMPIRE_COIN_INR, priceBreakdown } from '@shared/calculations'
import { CURRENCIES, SALE_SOURCES, type SellSkinInput } from '@shared/models'
import { todayInput } from './purchase'

export const saleFormSchema = z
  .object({
    sale_source: z.enum(SALE_SOURCES),
    currency: z.enum(CURRENCIES),
    price: z.string().min(1, 'Sale price is required'),
    exchange_rate: z.string().min(1, 'Exchange rate is required'),
    fee_percentage: z.string().default('0'),
    sale_date: z.string().min(1, 'Sale date is required'),
    notes: z.string().default(''),
  })
  .superRefine((v, ctx) => {
    const price = Number(v.price)
    if (!Number.isFinite(price) || price <= 0) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Enter a price greater than 0' })
    }
    const rate = Number(v.exchange_rate)
    if (!Number.isFinite(rate) || rate <= 0) {
      ctx.addIssue({ code: 'custom', path: ['exchange_rate'], message: 'Enter a valid exchange rate' })
    }
    const fee = Number(v.fee_percentage)
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      ctx.addIssue({ code: 'custom', path: ['fee_percentage'], message: 'Fee must be between 0 and 100%' })
    }
  })

export type SaleFormValues = z.infer<typeof saleFormSchema>

export function defaultSaleValues(exchangeRate: number, defaultFee: number): SaleFormValues {
  return {
    sale_source: 'CSFloat',
    currency: 'USD',
    price: '',
    exchange_rate: String(exchangeRate),
    fee_percentage: String(defaultFee),
    sale_date: todayInput(),
    notes: '',
  }
}

function toIsoDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function saleValuesToSellInput(
  v: SaleFormValues,
  empireCoinInr = DEFAULT_EMPIRE_COIN_INR,
): SellSkinInput {
  const price = Number(v.price)
  const rate = Number(v.exchange_rate)
  const breakdown = priceBreakdown(v.currency, price, rate, empireCoinInr)
  return {
    sale_source: v.sale_source,
    sale_price_usd: breakdown.usd,
    sale_price_inr: breakdown.inr,
    sale_price_empire: breakdown.empire,
    sale_exchange_rate: rate,
    sale_fee_percentage: Number(v.fee_percentage) || 0,
    sale_date: toIsoDate(v.sale_date),
    notes: v.notes.trim() || null,
  }
}

export { CURRENCIES, SALE_SOURCES }
