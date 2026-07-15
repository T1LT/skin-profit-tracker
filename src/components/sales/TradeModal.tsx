import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { SkinName } from '@/components/skins/SkinName'
import {
  CURRENCIES,
  SALE_SOURCES,
  defaultSaleValues,
  saleFormSchema,
  saleValuesFromSkin,
  saleValuesToListInput,
  saleValuesToSellInput,
  type SaleFormValues,
} from '@/validation/sale'
import { computeTradeProfit, priceBreakdown, type TradeProfit } from '@shared/calculations'
import { MARKETPLACE_FEES } from '@shared/constants'
import { formatDate, formatHoldingTime, formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Currency, Skin } from '@shared/models'

const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD ($)',
  INR: 'INR (₹)',
  EMPIRE: 'Empire coins',
}

/**
 * `list` puts an owned skin on the market, `sell` closes the trade, and the two
 * `edit-*` modes correct an already-recorded listing or sale in place.
 */
export type TradeMode = 'list' | 'sell' | 'edit-list' | 'edit-sale'

const COPY: Record<TradeMode, { title: string; cta: string; priceLabel: string; dateLabel: string }> = {
  list: { title: 'List skin', cta: 'List for sale', priceLabel: 'Ask price', dateLabel: 'Listed on' },
  sell: { title: 'Sell skin', cta: 'Confirm sale', priceLabel: 'Sale price', dateLabel: 'Sale date' },
  'edit-list': { title: 'Edit listing', cta: 'Save listing', priceLabel: 'Ask price', dateLabel: 'Listed on' },
  'edit-sale': { title: 'Edit sale', cta: 'Save sale', priceLabel: 'Sale price', dateLabel: 'Sale date' },
}

const STATUS_BADGE: Record<string, { label: string; variant: 'brand' | 'warning' | 'success' }> = {
  owned: { label: 'Owned', variant: 'brand' },
  listed: { label: 'Listed', variant: 'warning' },
  sold: { label: 'Sold', variant: 'success' },
}

export function TradeModal({
  skin,
  mode,
  onClose,
  onSaved,
}: {
  skin: Skin | null
  mode: TradeMode
  onClose: () => void
  onSaved: (updated: Skin) => void
}) {
  const { money, settings } = useSettings()
  const toast = useToast()
  const copy = COPY[mode]
  const isListSide = mode === 'list' || mode === 'edit-list'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: defaultSaleValues(settings),
  })
  const values = watch()

  // The marketplace-fee autofill below must not clobber the values we seed here, so it
  // is told to stand down until the user actually touches the source select.
  const sourceTouched = useRef(false)

  useEffect(() => {
    if (!skin) return
    sourceTouched.current = false
    if (mode === 'edit-list') reset(saleValuesFromSkin(skin, 'list', settings))
    else if (mode === 'edit-sale') reset(saleValuesFromSkin(skin, 'sale', settings))
    else if (mode === 'sell' && skin.status === 'listed') {
      // Selling something that was listed: carry the listing's terms over, but the sale
      // is happening today, not on the day it was listed.
      reset(saleValuesFromSkin(skin, 'list', settings, 'today'))
    } else reset(defaultSaleValues(settings))
  }, [skin, mode, reset, settings])

  // Auto-fill the fee from the chosen marketplace — but only once the user picks one,
  // otherwise this fires on mount and overwrites a seeded or previously-saved fee.
  useEffect(() => {
    if (!sourceTouched.current) return
    const fee = MARKETPLACE_FEES[values.sale_source]
    if (fee != null) setValue('fee_percentage', String(fee))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.sale_source])

  const pnl = useMemo<TradeProfit | null>(() => {
    if (!skin) return null
    const price = Number(values.price)
    const rate = Number(values.exchange_rate)
    const coin = Number(values.empire_coin_inr)
    const fee = Number(values.fee_percentage)
    if (!Number.isFinite(price) || price <= 0) return null
    const gross = priceBreakdown(
      values.currency,
      price,
      Number.isFinite(rate) ? rate : 0,
      Number.isFinite(coin) ? coin : settings.empire_coin_inr,
    ).inr
    return computeTradeProfit({
      purchaseInr: skin.purchase_price_inr ?? 0,
      grossSaleInr: gross,
      feePct: Number.isFinite(fee) ? fee : 0,
      purchaseDate: skin.purchase_date,
      saleDate: values.sale_date,
    })
  }, [
    skin,
    values.price,
    values.exchange_rate,
    values.empire_coin_inr,
    values.fee_percentage,
    values.currency,
    values.sale_date,
    settings.empire_coin_inr,
  ])

  const onSubmit = async (v: SaleFormValues) => {
    if (!skin) return
    try {
      let updated: Skin | null = null
      if (mode === 'list') updated = await api.skins.listForSale(skin.id, saleValuesToListInput(v))
      else if (mode === 'sell') updated = await api.skins.sell(skin.id, saleValuesToSellInput(v))
      else if (mode === 'edit-list') updated = await api.skins.update(skin.id, saleValuesToListInput(v))
      else updated = await api.skins.update(skin.id, saleValuesToSellInput(v))

      if (!updated) return
      onSaved(updated)
      if (mode === 'list') {
        toast.success(`Listed at ${money(updated.list_price_inr)}.`, { title: 'Listing saved' })
      } else if (mode === 'sell') {
        toast.success(`Sold for ${money(updated.sale_price_inr)}.`, {
          title: 'Sale completed',
          desktop: true,
        })
      } else {
        toast.success('Changes saved.')
      }
      onClose()
    } catch {
      toast.error(`Could not save this ${isListSide ? 'listing' : 'sale'}.`)
    }
  }

  const priceAdornment =
    values.currency === 'EMPIRE'
      ? { suffix: 'coins' }
      : { prefix: values.currency === 'USD' ? '$' : settings.currency_symbol }

  const badge = skin ? (STATUS_BADGE[skin.status] ?? STATUS_BADGE.owned) : STATUS_BADGE.owned

  return (
    <Modal
      open={!!skin}
      onClose={onClose}
      title={copy.title}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isListSide ? <Tag className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {copy.cta}
          </Button>
        </>
      }
    >
      {skin && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-bg-soft/50 p-3.5">
            <div className="min-w-0">
              <SkinName
                weapon={skin.weapon}
                finish={skin.finish}
                wear={skin.wear}
                stattrak={skin.stattrak}
                souvenir={skin.souvenir}
              />
              <p className="mt-1 text-xs text-faint">
                Bought for {money(skin.purchase_price_inr)} · {formatDate(skin.purchase_date)}
              </p>
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Marketplace" required>
              <Select
                {...register('sale_source', {
                  onChange: () => {
                    sourceTouched.current = true
                  },
                })}
              >
                {SALE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.dateLabel} required error={errors.sale_date?.message}>
              <Input type="date" error={!!errors.sale_date} {...register('sale_date')} />
            </Field>
            <Field label="Currency" required>
              <Select {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.priceLabel} required error={errors.price?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                error={!!errors.price}
                {...priceAdornment}
                {...register('price')}
              />
            </Field>
            <Field label="Fees %" error={errors.fee_percentage?.message}>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                inputMode="decimal"
                suffix="%"
                error={!!errors.fee_percentage}
                {...register('fee_percentage')}
              />
            </Field>
            <Field label="Exchange rate (USD → INR)" error={errors.exchange_rate?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                prefix={settings.currency_symbol}
                error={!!errors.exchange_rate}
                {...register('exchange_rate')}
              />
            </Field>
            <Field
              label="Empire coin rate (1 coin → INR)"
              error={errors.empire_coin_inr?.message}
              hint="Frozen on this trade — changing it in Settings later won't rewrite it."
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                prefix={settings.currency_symbol}
                error={!!errors.empire_coin_inr}
                {...register('empire_coin_inr')}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea placeholder="Anything worth remembering…" {...register('notes')} />
            </Field>
          </form>

          <SalePnl
            pnl={pnl}
            money={money}
            symbol={settings.currency_symbol}
            projected={isListSide}
          />
        </div>
      )}
    </Modal>
  )
}

function BreakdownRow({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn('font-medium tabular-nums', muted ? 'text-muted' : 'text-content')}>{value}</span>
    </div>
  )
}

function SalePnl({
  pnl,
  money,
  symbol,
  projected,
}: {
  pnl: TradeProfit | null
  money: (n: number | null | undefined) => string
  symbol: string
  /** A listing hasn't sold yet, so its profit is what it *would* make at the ask price. */
  projected?: boolean
}) {
  if (!pnl) {
    return (
      <div className="rounded-xl border border-dashed border-line/70 p-5 text-center text-sm text-faint">
        Enter a price to see your {projected ? 'projected ' : ''}profit, ROI and holding time.
      </div>
    )
  }
  const positive = pnl.profitInr >= 0
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        positive ? 'border-success/25 bg-success/[0.05]' : 'border-danger/25 bg-danger/[0.05]',
      )}
    >
      <div className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-8">
        <BreakdownRow label="Purchase cost" value={money(pnl.purchaseInr)} />
        <BreakdownRow label={projected ? 'Gross ask' : 'Gross sale'} value={money(pnl.grossSaleInr)} />
        <BreakdownRow label="Marketplace fee" value={`−${money(pnl.feeInr)}`} muted />
        <BreakdownRow label={projected ? 'Net if it sells' : 'Net sale'} value={money(pnl.netSaleInr)} />
      </div>
      <div className="my-3 border-t border-line/50" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {projected ? 'Profit if it sells at this price' : 'Profit'}
          </p>
          <p
            className={cn(
              'text-2xl font-semibold [font-variant-numeric:tabular-nums]',
              positive ? 'text-success' : 'text-danger',
            )}
          >
            {formatSignedMoney(pnl.profitInr, symbol)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className={cn('font-semibold', positive ? 'text-success' : 'text-danger')}>
            {formatPercent(pnl.profitPct, { signed: true })} · ROI {formatPercent(pnl.roi, { signed: true })}
          </p>
          <p className="text-xs text-faint">Held {formatHoldingTime(pnl.holdingDays)}</p>
        </div>
      </div>
    </div>
  )
}
