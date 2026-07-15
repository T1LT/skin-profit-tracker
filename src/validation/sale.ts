import { z } from 'zod'
import { priceBreakdown } from '@shared/calculations'
import {
  CURRENCIES,
  SALE_SOURCES,
  type AppSettings,
  type Currency,
  type ListSkinInput,
  type SellSkinInput,
  type Skin,
} from '@shared/models'
import { todayInput } from './purchase'

/**
 * One form backs all four trade actions — listing a skin, selling it, and editing
 * either of those after the fact. `TradeSide` picks which set of columns the values
 * are read from and written back to.
 */
export type TradeSide = 'list' | 'sale'

export const saleFormSchema = z
  .object({
    sale_source: z.enum(SALE_SOURCES),
    currency: z.enum(CURRENCIES),
    price: z.string().min(1, 'Price is required'),
    exchange_rate: z.string().min(1, 'Exchange rate is required'),
    empire_coin_inr: z.string().min(1, 'Empire coin rate is required'),
    fee_percentage: z.string().default('0'),
    sale_date: z.string().min(1, 'Date is required'),
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
    const coin = Number(v.empire_coin_inr)
    if (!Number.isFinite(coin) || coin <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['empire_coin_inr'],
        message: 'Enter a valid coin rate',
      })
    }
    const fee = Number(v.fee_percentage)
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      ctx.addIssue({ code: 'custom', path: ['fee_percentage'], message: 'Fee must be between 0 and 100%' })
    }
  })

export type SaleFormValues = z.infer<typeof saleFormSchema>

/** A blank form, seeded from the user's settings. */
export function defaultSaleValues(settings: AppSettings): SaleFormValues {
  return {
    sale_source: 'CSFloat',
    currency: settings.default_currency,
    price: '',
    exchange_rate: String(settings.exchange_rate),
    empire_coin_inr: String(settings.empire_coin_inr),
    fee_percentage: String(settings.default_fee_percentage),
    sale_date: todayInput(),
    notes: '',
  }
}

/** The price a skin is recorded at on one side of the trade, in the given currency. */
function priceIn(skin: Skin, side: TradeSide, currency: Currency): number | null {
  if (side === 'list') {
    if (currency === 'USD') return skin.list_price_usd
    if (currency === 'EMPIRE') return skin.list_price_empire
    return skin.list_price_inr
  }
  if (currency === 'USD') return skin.sale_price_usd
  if (currency === 'EMPIRE') return skin.sale_price_empire
  return skin.sale_price_inr
}

/**
 * Read a skin's existing listing or sale back into form values — used both to edit a
 * recorded trade and to pre-fill the sale form from the listing when a listing sells.
 * `dateMode: 'today'` is for the latter: the listing's terms carry over, but the sale
 * happened now, not when it was listed.
 */
export function saleValuesFromSkin(
  skin: Skin,
  side: TradeSide,
  settings: AppSettings,
  dateMode: 'recorded' | 'today' = 'recorded',
): SaleFormValues {
  const base = defaultSaleValues(settings)
  const source = side === 'list' ? skin.list_source : skin.sale_source
  const currency = (side === 'list' ? skin.list_currency : skin.sale_currency) ?? base.currency
  const price = priceIn(skin, side, currency)
  const rate = side === 'list' ? skin.list_exchange_rate : skin.sale_exchange_rate
  const coin = side === 'list' ? skin.list_empire_rate : skin.sale_empire_rate
  const fee = side === 'list' ? skin.list_fee_percentage : skin.sale_fee_percentage
  const date = side === 'list' ? skin.list_date : skin.sale_date

  return {
    sale_source: source ?? base.sale_source,
    currency,
    price: price != null ? String(price) : '',
    exchange_rate: String(rate ?? settings.exchange_rate),
    empire_coin_inr: String(coin ?? settings.empire_coin_inr),
    fee_percentage: String(fee ?? settings.default_fee_percentage),
    sale_date: dateMode === 'today' ? todayInput() : (date || '').slice(0, 10) || todayInput(),
    notes: skin.notes ?? '',
  }
}

function toIsoDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** The rates entered on the form win over the live settings, so history stays frozen. */
function breakdownOf(v: SaleFormValues) {
  const rate = Number(v.exchange_rate)
  const coin = Number(v.empire_coin_inr)
  return {
    rate,
    coin,
    ...priceBreakdown(v.currency, Number(v.price), rate, coin),
  }
}

export function saleValuesToSellInput(v: SaleFormValues): SellSkinInput {
  const b = breakdownOf(v)
  return {
    sale_source: v.sale_source,
    sale_currency: v.currency,
    sale_price_usd: b.usd,
    sale_price_inr: b.inr,
    sale_price_empire: b.empire,
    sale_exchange_rate: b.rate,
    sale_empire_rate: b.coin,
    sale_fee_percentage: Number(v.fee_percentage) || 0,
    sale_date: toIsoDate(v.sale_date),
    notes: v.notes.trim() || null,
  }
}

export function saleValuesToListInput(v: SaleFormValues): ListSkinInput {
  const b = breakdownOf(v)
  return {
    list_source: v.sale_source,
    list_currency: v.currency,
    list_price_usd: b.usd,
    list_price_inr: b.inr,
    list_price_empire: b.empire,
    list_exchange_rate: b.rate,
    list_empire_rate: b.coin,
    list_fee_percentage: Number(v.fee_percentage) || 0,
    list_date: toIsoDate(v.sale_date),
    notes: v.notes.trim() || null,
  }
}

export { CURRENCIES, SALE_SOURCES }
