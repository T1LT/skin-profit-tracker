import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

/** ₹ money using Indian digit grouping (1,23,456). */
export function formatMoney(
  amount: number | null | undefined,
  symbol = '₹',
  opts: { decimals?: number } = {},
): string {
  if (amount == null || Number.isNaN(amount)) return `${symbol}0`
  const decimals = opts.decimals ?? 0
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol}${formatted}`
}

/** Compact money for tight tiles: ₹1.2L, ₹3.4Cr. */
export function formatMoneyCompact(amount: number | null | undefined, symbol = '₹'): string {
  if (amount == null || Number.isNaN(amount)) return `${symbol}0`
  const abs = Math.abs(amount)
  if (abs < 100_000) return formatMoney(amount, symbol)
  const formatted = new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`
}

/** A signed money string with an explicit + for gains. */
export function formatSignedMoney(amount: number | null | undefined, symbol = '₹'): string {
  if (amount == null || Number.isNaN(amount)) return `${symbol}0`
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}${symbol}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.abs(amount),
  )}`
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return '0'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(
  value: number | null | undefined,
  opts: { decimals?: number; signed?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return '0%'
  const decimals = opts.decimals ?? 1
  const sign = opts.signed && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Floats are recorded to as many as 12 decimals, so render every digit the user
 * actually entered — but pad short ones out to 4 places so the column stays aligned.
 */
export function formatFloatValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const full = value.toFixed(12).replace(/0+$/, '')
  const [whole, decimals = ''] = full.split('.')
  return `${whole}.${decimals.padEnd(4, '0')}`
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'd MMM yyyy') : '—'
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'd MMM yyyy, HH:mm') : '—'
}

export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

/** Human holding time: "5d", "2mo 4d", "1y 3mo". */
export function formatHoldingTime(days: number | null | undefined): string {
  if (days == null || Number.isNaN(days) || days <= 0) return days === 0 ? 'Same day' : '—'
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) {
    const months = Math.floor(days / 30)
    const rem = Math.round(days - months * 30)
    return rem > 0 ? `${months}mo ${rem}d` : `${months}mo`
  }
  const years = Math.floor(days / 365)
  const months = Math.floor((days - years * 365) / 30)
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

/** Tailwind text class for a signed value. */
export function signClass(value: number | null | undefined): string {
  if (value == null || value === 0) return 'text-muted'
  return value > 0 ? 'text-success' : 'text-danger'
}
