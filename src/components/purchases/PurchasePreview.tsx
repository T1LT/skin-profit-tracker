import { ArrowRight, CalendarDays, Eye, Hash, Sparkles, Store } from 'lucide-react'
import { Panel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkinName } from '@/components/skins/SkinName'
import { useSettings } from '@/providers/SettingsProvider'
import { formatDate, formatFloatValue, formatUsd } from '@/lib/format'
import { priceBreakdown } from '@shared/calculations'
import type { Currency, Wear } from '@shared/models'
import type { PurchaseFormValues } from '@/validation/purchase'

function enteredLabel(currency: Currency, amount: number, symbol: string): string {
  if (currency === 'USD') return formatUsd(amount)
  if (currency === 'EMPIRE') return `${amount.toLocaleString('en-US')} coins`
  return `${symbol}${amount.toLocaleString('en-IN')}`
}

export function PurchasePreview({ values }: { values: PurchaseFormValues }) {
  const { money, settings } = useSettings()
  const price = Number(values.price)
  const rate = Number(values.exchange_rate)
  const hasPrice = Number.isFinite(price) && price > 0
  const breakdown = hasPrice
    ? priceBreakdown(values.currency, price, Number.isFinite(rate) ? rate : 0, settings.empire_coin_inr)
    : null
  const empty = !values.weapon.trim()

  return (
    <Panel title="Preview" icon={<Eye className="h-4 w-4" />}>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-faint">
          <Sparkles className="h-7 w-7 opacity-50" />
          <p className="text-sm">Fill in the details to preview your purchase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <SkinName
              weapon={values.weapon}
              finish={values.finish}
              wear={(values.wear || null) as Wear | null}
              stattrak={values.stattrak}
              souvenir={values.souvenir}
              className="text-[15px]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {values.category && <Badge variant="muted">{values.category}</Badge>}
              {values.float_value !== '' && (
                <Badge variant="outline">Float {formatFloatValue(Number(values.float_value))}</Badge>
              )}
              {values.pattern !== '' && (
                <Badge variant="outline">
                  <Hash className="h-3 w-3" />
                  {values.pattern}
                </Badge>
              )}
              {values.favorite && <Badge variant="gold">Favorite</Badge>}
            </div>
          </div>

          <div className="rounded-xl border border-line/60 bg-bg-soft/50 p-3.5">
            {breakdown ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Entered</span>
                  <span className="font-medium text-content">
                    {enteredLabel(values.currency, price, settings.currency_symbol)}
                  </span>
                </div>
                <div className="my-2.5 flex items-center gap-2 text-faint">
                  <span className="h-px flex-1 bg-line/60" />
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="h-px flex-1 bg-line/60" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">Cost in INR</span>
                  <span className="text-xl font-semibold text-content [font-variant-numeric:tabular-nums]">
                    {money(breakdown.inr)}
                  </span>
                </div>
                {values.currency !== 'USD' && breakdown.usd != null && (
                  <p className="mt-1 text-right text-xs text-faint">≈ {formatUsd(breakdown.usd)}</p>
                )}
                {values.currency === 'USD' && (
                  <p className="text-right text-[11px] text-faint">
                    at {settings.currency_symbol}
                    {Number.isFinite(rate) ? rate : 0}/USD
                  </p>
                )}
                {values.currency === 'EMPIRE' && (
                  <p className="text-right text-[11px] text-faint">
                    at {settings.currency_symbol}
                    {settings.empire_coin_inr}/coin
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-sm text-faint">Enter a price to see the INR cost.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-faint" />
              {values.purchase_source}
            </span>
            <span className="text-faint">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-faint" />
              {formatDate(values.purchase_date)}
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}
