import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeftRight, ShoppingCart, Tag, TrendingDown, TrendingUp } from 'lucide-react'
import { useSettings } from '@/providers/SettingsProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { computeArbitrage } from '@shared/calculations'
import { MARKETPLACE_FEES } from '@shared/constants'
import {
  CURRENCIES,
  PURCHASE_SOURCES,
  SALE_SOURCES,
  type Currency,
  type PurchaseSource,
  type SaleSource,
} from '@shared/models'
import { formatNumber, formatPercent, formatSignedMoney, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD ($)',
  INR: 'INR (₹)',
  EMPIRE: 'Empire coins',
}

interface ArbState {
  skinName: string
  purchaseSource: PurchaseSource
  purchaseCurrency: Currency
  purchasePrice: string
  purchaseFee: string
  saleSource: SaleSource
  saleCurrency: Currency
  salePrice: string
  saleFee: string
  exchangeRate: string
}

export default function Arbitrage() {
  const { money, settings } = useSettings()
  const rateEdited = useRef(false)

  const [state, setState] = useState<ArbState>(() => ({
    skinName: '',
    purchaseSource: 'CSFloat',
    purchaseCurrency: 'USD',
    purchasePrice: '',
    purchaseFee: '0',
    saleSource: 'Empire',
    saleCurrency: 'USD',
    salePrice: '',
    saleFee: String(MARKETPLACE_FEES.Empire ?? 0),
    exchangeRate: String(settings.exchange_rate),
  }))

  useEffect(() => {
    if (!rateEdited.current) setState((s) => ({ ...s, exchangeRate: String(settings.exchange_rate) }))
  }, [settings.exchange_rate])

  const update = <K extends keyof ArbState>(key: K, value: ArbState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const changeSaleSource = (src: SaleSource) =>
    setState((s) => ({ ...s, saleSource: src, saleFee: String(MARKETPLACE_FEES[src] ?? s.saleFee) }))

  const result = useMemo(
    () =>
      computeArbitrage({
        purchaseCurrency: state.purchaseCurrency,
        purchasePrice: Number(state.purchasePrice) || 0,
        purchaseFeePct: Number(state.purchaseFee) || 0,
        saleCurrency: state.saleCurrency,
        salePrice: Number(state.salePrice) || 0,
        saleFeePct: Number(state.saleFee) || 0,
        exchangeRate: Number(state.exchangeRate) || 0,
        empireCoinInr: settings.empire_coin_inr,
      }),
    [state, settings.empire_coin_inr],
  )

  const hasInput = Number(state.purchasePrice) > 0 && Number(state.salePrice) > 0
  const breakEvenValid = Number(state.saleFee) < 100 && result.breakEvenInr > 0

  const adorn = (c: Currency) =>
    c === 'EMPIRE' ? { suffix: 'coins' } : { prefix: c === 'USD' ? '$' : settings.currency_symbol }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ArrowLeftRight className="h-5 w-5" />}
        title="Arbitrage Calculator"
        subtitle="Is buying here and selling there profitable? Updates as you type."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Inputs */}
        <Panel title="Trade details">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Skin name" className="sm:col-span-1">
                <Input
                  value={state.skinName}
                  onChange={(e) => update('skinName', e.target.value)}
                  placeholder="AK-47 | Redline (FT)"
                />
              </Field>
              <Field label="Exchange rate (USD → INR)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  prefix={settings.currency_symbol}
                  value={state.exchangeRate}
                  onChange={(e) => {
                    rateEdited.current = true
                    update('exchangeRate', e.target.value)
                  }}
                />
              </Field>
            </div>

            <Section icon={<ShoppingCart className="h-4 w-4 text-info" />} label="Buy">
              <Field label="Source">
                <Select
                  value={state.purchaseSource}
                  onChange={(e) => update('purchaseSource', e.target.value as PurchaseSource)}
                >
                  {PURCHASE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency">
                <Select
                  value={state.purchaseCurrency}
                  onChange={(e) => update('purchaseCurrency', e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purchase price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={state.purchasePrice}
                  onChange={(e) => update('purchasePrice', e.target.value)}
                  {...adorn(state.purchaseCurrency)}
                />
              </Field>
              <Field label="Buy fee %">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  inputMode="decimal"
                  suffix="%"
                  value={state.purchaseFee}
                  onChange={(e) => update('purchaseFee', e.target.value)}
                />
              </Field>
            </Section>

            <div className="flex justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-faint">
                <ArrowDown className="h-4 w-4" />
              </span>
            </div>

            <Section icon={<Tag className="h-4 w-4 text-accent" />} label="Sell">
              <Field label="Marketplace">
                <Select
                  value={state.saleSource}
                  onChange={(e) => changeSaleSource(e.target.value as SaleSource)}
                >
                  {SALE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency">
                <Select
                  value={state.saleCurrency}
                  onChange={(e) => update('saleCurrency', e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expected sale price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={state.salePrice}
                  onChange={(e) => update('salePrice', e.target.value)}
                  {...adorn(state.saleCurrency)}
                />
              </Field>
              <Field label="Sale fee %">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  inputMode="decimal"
                  suffix="%"
                  value={state.saleFee}
                  onChange={(e) => update('saleFee', e.target.value)}
                />
              </Field>
            </Section>
          </div>
        </Panel>

        {/* Results */}
        <div className="space-y-4">
          <div className="sticky top-2 space-y-4">
            <ResultBanner
              profit={result.profitInr}
              profitPct={result.profitPct}
              roi={result.roi}
              hasInput={hasInput}
              symbol={settings.currency_symbol}
            />

            <Panel title="Breakdown">
              <div className="space-y-2 text-sm">
                <Row label="Purchase cost" value={money(result.purchaseInr)} />
                {Number(state.purchaseFee) > 0 && (
                  <Row label={`Buy fee (${state.purchaseFee}%)`} value={`+${money(result.purchaseFeeInr)}`} muted />
                )}
                <Row label="Gross sale" value={money(result.saleGrossInr)} />
                <Row label={`Marketplace fee (${state.saleFee || 0}%)`} value={`−${money(result.saleFeeInr)}`} muted />
                <Row label="Net sale" value={money(result.netSaleInr)} />
                <div className="my-1 border-t border-line/50" />
                <Row
                  label="Profit"
                  value={formatSignedMoney(result.profitInr, settings.currency_symbol)}
                  strong
                  tone={result.isProfit ? 'success' : 'danger'}
                />
              </div>
            </Panel>

            <Panel title="Break-even sale price" subtitle="Sell above this to turn a profit">
              {breakEvenValid ? (
                <div className="grid grid-cols-3 gap-3">
                  <BreakEven label="INR" value={money(result.breakEvenInr)} />
                  <BreakEven label="USD" value={formatUsd(result.breakEvenUsd)} />
                  <BreakEven label="Empire" value={`${formatNumber(result.breakEvenEmpire, 0)} c`} />
                </div>
              ) : (
                <p className="text-sm text-faint">Enter a purchase price and a sale fee below 100%.</p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-line/60 bg-bg-soft/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-content">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
  tone,
}: {
  label: string
  value: ReactNode
  muted?: boolean
  strong?: boolean
  tone?: 'success' | 'danger'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'text-base font-semibold' : 'font-medium',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          !tone && (muted ? 'text-muted' : 'text-content'),
        )}
      >
        {value}
      </span>
    </div>
  )
}

function BreakEven({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-bg-soft/50 p-3 text-center">
      <p className="text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold text-content [font-variant-numeric:tabular-nums]">{value}</p>
    </div>
  )
}

function ResultBanner({
  profit,
  profitPct,
  roi,
  hasInput,
  symbol,
}: {
  profit: number
  profitPct: number
  roi: number
  hasInput: boolean
  symbol: string
}) {
  if (!hasInput) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line/70 py-12 text-center text-faint">
        <ArrowLeftRight className="h-8 w-8 opacity-50" />
        <p className="text-sm">Enter a purchase and sale price to see the result.</p>
      </div>
    )
  }
  const positive = profit >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        positive ? 'border-success/30 bg-success/[0.08]' : 'border-danger/30 bg-danger/[0.08]',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl',
          positive ? 'bg-success/20' : 'bg-danger/20',
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <Badge variant={positive ? 'success' : 'danger'}>
            {positive ? 'Profitable' : 'Loss'}
          </Badge>
        </div>
      </div>
      <p
        className={cn(
          'relative mt-4 text-4xl font-bold tracking-tight [font-variant-numeric:tabular-nums]',
          positive ? 'text-success' : 'text-danger',
        )}
      >
        {formatSignedMoney(profit, symbol)}
      </p>
      <p className="relative mt-1.5 text-sm text-muted">
        {formatPercent(profitPct, { signed: true })} profit · {formatPercent(roi, { signed: true })} ROI
      </p>
    </div>
  )
}
