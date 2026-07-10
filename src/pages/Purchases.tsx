import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ClipboardPaste, PencilLine, RotateCcw, Save, ShoppingCart, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { SkinName } from '@/components/skins/SkinName'
import { PasteBox } from '@/components/purchases/PasteBox'
import { PurchasePreview } from '@/components/purchases/PurchasePreview'
import {
  CURRENCIES,
  ITEM_CATEGORIES,
  PURCHASE_SOURCES,
  WEAR_VALUES,
  defaultPurchaseValues,
  purchaseFormSchema,
  purchaseValuesToCreateInput,
  type PurchaseFormValues,
  type PurchaseMode,
} from '@/validation/purchase'
import { detectSource, parseListing, type ListingSource } from '@shared/parsers'
import type { Currency, Skin } from '@shared/models'

const MODE_OPTIONS = [
  { value: 'csfloat' as const, label: 'CSFloat', icon: ClipboardPaste },
  { value: 'empire' as const, label: 'CSGOEmpire', icon: ClipboardPaste },
  { value: 'manual' as const, label: 'Manual', icon: PencilLine },
]

const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD ($)',
  INR: 'INR (₹)',
  EMPIRE: 'Empire coins',
}

export default function Purchases() {
  const { settings } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()

  const [mode, setMode] = useState<PurchaseMode>('csfloat')
  const [paste, setPaste] = useState('')
  const [saving, setSaving] = useState(false)
  const [added, setAdded] = useState<Skin[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: defaultPurchaseValues('csfloat', settings.exchange_rate),
  })

  const values = watch()

  // Keep the exchange-rate default in sync with settings until the user edits it.
  useEffect(() => {
    if (!dirtyFields.exchange_rate) {
      setValue('exchange_rate', String(settings.exchange_rate))
    }
  }, [settings.exchange_rate, dirtyFields.exchange_rate, setValue])

  const parsed = useMemo(() => {
    if (mode === 'manual' || !paste.trim()) return null
    return parseListing(paste, mode === 'empire' ? 'CSGOEmpire' : 'CSFloat')
  }, [paste, mode])

  const mismatch = useMemo<ListingSource | null>(() => {
    if (mode === 'manual' || !paste.trim()) return null
    const detected = detectSource(paste)
    const expected: ListingSource = mode === 'empire' ? 'CSGOEmpire' : 'CSFloat'
    return detected && detected !== expected ? detected : null
  }, [paste, mode])

  // Push parsed fields into the form whenever the parse result changes.
  useEffect(() => {
    if (!parsed) return
    setValue('weapon', parsed.weapon, { shouldValidate: true })
    setValue('finish', parsed.finish)
    setValue('wear', parsed.wear ?? '')
    setValue('float_value', parsed.float_value != null ? String(parsed.float_value) : '')
    setValue('pattern', parsed.pattern != null ? String(parsed.pattern) : '')
    setValue('stattrak', parsed.stattrak)
    setValue('souvenir', parsed.souvenir)
    setValue('category', parsed.category ?? '')
    if (parsed.source === 'CSFloat') {
      setValue('currency', 'USD')
      setValue('purchase_source', 'CSFloat')
      if (parsed.price_usd != null) setValue('price', String(parsed.price_usd), { shouldValidate: true })
    } else {
      setValue('currency', 'EMPIRE')
      setValue('purchase_source', 'CSGOEmpire')
      if (parsed.price_empire != null) setValue('price', String(parsed.price_empire), { shouldValidate: true })
    }
  }, [parsed, setValue])

  const changeMode = (next: PurchaseMode) => {
    setMode(next)
    setPaste('')
    reset(defaultPurchaseValues(next, Number(values.exchange_rate) || settings.exchange_rate))
  }

  const switchToDetected = (src: ListingSource) => {
    setMode(src === 'CSGOEmpire' ? 'empire' : 'csfloat')
  }

  const onSubmit = useCallback(
    async (v: PurchaseFormValues) => {
      setSaving(true)
      try {
        const created = await api.skins.create(purchaseValuesToCreateInput(v, settings.empire_coin_inr))
        setAdded((prev) => [created, ...prev].slice(0, 6))
        toast.success(
          `${created.weapon}${created.finish ? ` | ${created.finish}` : ''} added to inventory.`,
          { title: 'Purchase saved', desktop: true },
        )
        setPaste('')
        reset(defaultPurchaseValues(mode, Number(v.exchange_rate) || settings.exchange_rate))
      } catch {
        toast.error('Could not save the purchase. Please try again.')
      } finally {
        setSaving(false)
      }
    },
    [mode, reset, settings.exchange_rate, settings.empire_coin_inr, toast],
  )

  // Ctrl+S saves.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSubmit, onSubmit])

  const priceAdornment =
    values.currency === 'EMPIRE'
      ? { suffix: 'coins' }
      : { prefix: values.currency === 'USD' ? '$' : settings.currency_symbol }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        icon={<ShoppingCart className="h-5 w-5" />}
        title="Purchases"
        subtitle="Add skins to your portfolio"
        actions={
          added.length > 0 ? (
            <Badge variant="success">
              <Sparkles className="h-3 w-3" />
              {added.length} added this session
            </Badge>
          ) : undefined
        }
      />

      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Inputs */}
        <div className="space-y-5 lg:col-span-3">
          {mode !== 'manual' && (
            <PasteBox
              source={mode === 'empire' ? 'CSGOEmpire' : 'CSFloat'}
              value={paste}
              onChange={setPaste}
              warnings={parsed?.warnings ?? []}
              mismatch={mismatch}
              onUseDetected={switchToDetected}
            />
          )}

          <Panel title="Details" subtitle="Review and adjust before saving">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Weapon" required error={errors.weapon?.message} className="sm:col-span-1">
                <Input placeholder="AK-47" error={!!errors.weapon} {...register('weapon')} />
              </Field>
              <Field label="Finish" error={errors.finish?.message}>
                <Input placeholder="Redline" {...register('finish')} />
              </Field>

              <Field label="Wear">
                <Select {...register('wear')}>
                  <option value="">— None —</option>
                  {WEAR_VALUES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Category">
                <Select {...register('category')}>
                  <option value="">Auto-detect</option>
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Float value" error={errors.float_value?.message} hint="0 – 1">
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  inputMode="decimal"
                  placeholder="0.1543"
                  error={!!errors.float_value}
                  {...register('float_value')}
                />
              </Field>
              <Field label="Pattern / paint seed" error={errors.pattern?.message}>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="1000"
                  inputMode="numeric"
                  placeholder="661"
                  error={!!errors.pattern}
                  {...register('pattern')}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
                <Controller
                  control={control}
                  name="stattrak"
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} label="StatTrak™" />
                  )}
                />
                <Controller
                  control={control}
                  name="souvenir"
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} label="Souvenir" />
                  )}
                />
                <Controller
                  control={control}
                  name="favorite"
                  render={({ field }) => (
                    <Toggle checked={field.value} onChange={field.onChange} label="Favorite" />
                  )}
                />
              </div>
            </div>

            <div className="my-5 border-t border-line/60" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Purchase source" required>
                <Select {...register('purchase_source')}>
                  {PURCHASE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purchase date" required error={errors.purchase_date?.message}>
                <Input type="date" error={!!errors.purchase_date} {...register('purchase_date')} />
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
              <Field label="Price" required error={errors.price?.message}>
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

              <Field
                label="Exchange rate (USD → INR)"
                required
                error={errors.exchange_rate?.message}
                hint={values.currency === 'INR' ? 'Stored with the record' : undefined}
              >
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
              <Field label="Tags" hint="Comma separated">
                <Input placeholder="high-tier, investment" {...register('tags')} />
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <Textarea placeholder="Anything worth remembering about this trade…" {...register('notes')} />
              </Field>
            </div>
          </Panel>
        </div>

        {/* Preview + actions */}
        <div className="lg:col-span-2">
          <div className="sticky top-2 space-y-4">
            <PurchasePreview values={values} />

            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1">
                <Save className="h-4 w-4" />
                Save purchase
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setPaste('')
                  reset(defaultPurchaseValues(mode, settings.exchange_rate))
                }}
                title="Reset form"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-faint">
              Press <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px]">Ctrl S</kbd> to save
            </p>

            {added.length > 0 && (
              <Panel title="Added this session">
                <ul className="-my-1 divide-y divide-line/50">
                  {added.map((skin) => (
                    <li key={skin.id} className="flex items-center justify-between gap-2 py-2">
                      <SkinName
                        weapon={skin.weapon}
                        finish={skin.finish}
                        wear={skin.wear}
                        stattrak={skin.stattrak}
                        souvenir={skin.souvenir}
                        className="text-[13px]"
                      />
                      <span className="shrink-0 text-xs font-medium text-muted [font-variant-numeric:tabular-nums]">
                        {settings.currency_symbol}
                        {(skin.purchase_price_inr ?? 0).toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => navigate('/inventory')}
                >
                  View all in inventory
                </Button>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
