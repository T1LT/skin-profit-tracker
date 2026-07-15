import { z } from 'zod'
import { DEFAULT_EMPIRE_COIN_INR, priceBreakdown } from '@shared/calculations'
import {
  CURRENCIES,
  ITEM_CATEGORIES,
  PURCHASE_SOURCES,
  WEAR_VALUES,
  type CreateSkinInput,
  type Currency,
  type ItemCategory,
  type PurchaseSource,
  type Wear,
} from '@shared/models'

/**
 * The purchase form keeps every numeric field as a string (so native inputs and
 * React Hook Form stay simple); `superRefine` validates the numbers and attaches
 * friendly, per-field error messages.
 */
export const purchaseFormSchema = z
  .object({
    weapon: z.string().trim().min(1, 'Weapon is required'),
    finish: z.string().trim().default(''),
    wear: z.string().default(''),
    float_value: z.string().default(''),
    pattern: z.string().default(''),
    stattrak: z.boolean().default(false),
    souvenir: z.boolean().default(false),
    category: z.string().default(''),
    purchase_source: z.enum(PURCHASE_SOURCES),
    currency: z.enum(CURRENCIES),
    price: z.string().min(1, 'Price is required'),
    exchange_rate: z.string().min(1, 'Exchange rate is required'),
    purchase_date: z.string().min(1, 'Purchase date is required'),
    notes: z.string().default(''),
    tags: z.string().default(''),
    favorite: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    const price = Number(val.price)
    if (!Number.isFinite(price) || price <= 0) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'Enter a price greater than 0' })
    }
    const rate = Number(val.exchange_rate)
    if (!Number.isFinite(rate) || rate <= 0) {
      ctx.addIssue({ code: 'custom', path: ['exchange_rate'], message: 'Enter a valid exchange rate' })
    }
    if (val.float_value !== '') {
      const f = Number(val.float_value)
      if (!Number.isFinite(f) || f < 0 || f > 1) {
        ctx.addIssue({ code: 'custom', path: ['float_value'], message: 'Float must be between 0 and 1' })
      }
    }
    if (val.pattern !== '') {
      const p = Number(val.pattern)
      if (!Number.isInteger(p) || p < 0 || p > 1000) {
        ctx.addIssue({ code: 'custom', path: ['pattern'], message: 'Pattern must be a whole number 0–1000' })
      }
    }
  })

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

export type PurchaseMode = 'csfloat' | 'empire' | 'manual'

/**
 * The paste modes force their own currency — the parser overwrites it from the listing
 * anyway — so only the manual form honours the user's default currency (`null` here).
 */
const MODE_DEFAULTS: Record<PurchaseMode, { source: PurchaseSource; currency: Currency | null }> = {
  csfloat: { source: 'CSFloat', currency: 'USD' },
  empire: { source: 'CSGOEmpire', currency: 'EMPIRE' },
  manual: { source: 'Manual', currency: null },
}

/** Today as yyyy-mm-dd for a native date input. */
export function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}

export function defaultPurchaseValues(
  mode: PurchaseMode,
  exchangeRate: number,
  defaultCurrency: Currency = 'USD',
): PurchaseFormValues {
  const { source, currency: modeCurrency } = MODE_DEFAULTS[mode]
  const currency = modeCurrency ?? defaultCurrency
  return {
    weapon: '',
    finish: '',
    wear: '',
    float_value: '',
    pattern: '',
    stattrak: false,
    souvenir: false,
    category: '',
    purchase_source: source,
    currency,
    price: '',
    exchange_rate: String(exchangeRate),
    purchase_date: todayInput(),
    notes: '',
    tags: '',
    favorite: false,
  }
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Build the stored display name from the individual fields. */
export function buildSkinName(v: {
  weapon: string
  finish?: string
  wear?: string
  stattrak?: boolean
  souvenir?: boolean
}): string {
  const parts: string[] = []
  if (v.souvenir) parts.push('Souvenir')
  if (v.stattrak) parts.push('StatTrak™')
  let core = v.weapon.trim()
  if (v.finish?.trim()) core += ` | ${v.finish.trim()}`
  parts.push(core)
  let name = parts.join(' ')
  if (v.wear) name += ` (${v.wear})`
  return name
}

function toIsoDate(dateStr: string): string {
  // Anchor at midday to avoid a timezone shift moving it to the previous day.
  const d = new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** Convert validated form values into a database CreateSkinInput. */
export function purchaseValuesToCreateInput(
  v: PurchaseFormValues,
  empireCoinInr = DEFAULT_EMPIRE_COIN_INR,
): CreateSkinInput {
  const price = Number(v.price)
  const rate = Number(v.exchange_rate)
  const breakdown = priceBreakdown(v.currency, price, rate, empireCoinInr)

  return {
    skin_name: buildSkinName(v),
    weapon: v.weapon.trim(),
    finish: v.finish.trim(),
    wear: (v.wear || null) as Wear | null,
    float_value: v.float_value === '' ? null : Number(v.float_value),
    pattern: v.pattern === '' ? null : Number(v.pattern),
    stattrak: v.stattrak,
    souvenir: v.souvenir,
    category: (v.category || null) as ItemCategory | null,
    purchase_source: v.purchase_source,
    purchase_currency: v.currency,
    purchase_price_usd: breakdown.usd,
    purchase_price_inr: breakdown.inr,
    purchase_price_empire: breakdown.empire,
    purchase_exchange_rate: rate,
    // Frozen with the row so a later change to the coin rate can't rewrite this cost.
    purchase_empire_rate: empireCoinInr,
    purchase_date: toIsoDate(v.purchase_date),
    notes: v.notes.trim() || null,
    favorite: v.favorite,
    tags: parseTags(v.tags),
  }
}

export { WEAR_VALUES, ITEM_CATEGORIES, PURCHASE_SOURCES, CURRENCIES }
