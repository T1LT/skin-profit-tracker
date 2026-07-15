import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { buildSkinName } from '@/validation/purchase'
import {
  ITEM_CATEGORIES,
  PURCHASE_SOURCES,
  SALE_SOURCES,
  WEAR_VALUES,
  type ItemCategory,
  type PurchaseSource,
  type SaleSource,
  type Skin,
  type UpdateSkinInput,
  type Wear,
} from '@shared/models'

interface EditFormState {
  weapon: string
  finish: string
  wear: string
  float_value: string
  pattern: string
  stattrak: boolean
  souvenir: boolean
  category: string
  purchase_source: PurchaseSource
  purchase_date: string
  purchase_price_inr: string
  purchase_price_usd: string
  purchase_price_empire: string
  purchase_exchange_rate: string
  purchase_empire_rate: string
  list_source: string
  list_date: string
  list_price_inr: string
  list_price_usd: string
  list_price_empire: string
  list_exchange_rate: string
  list_empire_rate: string
  list_fee_percentage: string
  sale_source: string
  sale_date: string
  sale_price_inr: string
  sale_price_usd: string
  sale_price_empire: string
  sale_exchange_rate: string
  sale_empire_rate: string
  sale_fee_percentage: string
  notes: string
  tags: string
  favorite: boolean
  pinned: boolean
}

function fromSkin(skin: Skin): EditFormState {
  const str = (n: number | null) => (n == null ? '' : String(n))
  return {
    weapon: skin.weapon,
    finish: skin.finish,
    wear: skin.wear ?? '',
    float_value: str(skin.float_value),
    pattern: str(skin.pattern),
    stattrak: skin.stattrak,
    souvenir: skin.souvenir,
    category: skin.category ?? '',
    purchase_source: skin.purchase_source,
    purchase_date: (skin.purchase_date || '').slice(0, 10),
    purchase_price_inr: str(skin.purchase_price_inr),
    purchase_price_usd: str(skin.purchase_price_usd),
    purchase_price_empire: str(skin.purchase_price_empire),
    purchase_exchange_rate: str(skin.purchase_exchange_rate),
    purchase_empire_rate: str(skin.purchase_empire_rate),
    list_source: skin.list_source ?? '',
    list_date: (skin.list_date || '').slice(0, 10),
    list_price_inr: str(skin.list_price_inr),
    list_price_usd: str(skin.list_price_usd),
    list_price_empire: str(skin.list_price_empire),
    list_exchange_rate: str(skin.list_exchange_rate),
    list_empire_rate: str(skin.list_empire_rate),
    list_fee_percentage: str(skin.list_fee_percentage),
    sale_source: skin.sale_source ?? '',
    sale_date: (skin.sale_date || '').slice(0, 10),
    sale_price_inr: str(skin.sale_price_inr),
    sale_price_usd: str(skin.sale_price_usd),
    sale_price_empire: str(skin.sale_price_empire),
    sale_exchange_rate: str(skin.sale_exchange_rate),
    sale_empire_rate: str(skin.sale_empire_rate),
    sale_fee_percentage: str(skin.sale_fee_percentage),
    notes: skin.notes ?? '',
    tags: skin.tags.join(', '),
    favorite: skin.favorite,
    pinned: skin.pinned,
  }
}

/** A yyyy-mm-dd form value back to a stored ISO timestamp (noon, to dodge TZ drift). */
const isoDate = (s: string): string | null =>
  s ? new Date(`${s}T12:00:00`).toISOString() : null

const num = (s: string): number | null => {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function EditSkinModal({
  skin,
  onClose,
  onSaved,
}: {
  skin: Skin | null
  onClose: () => void
  onSaved: (updated: Skin) => void
}) {
  const { settings } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(skin ? fromSkin(skin) : null)
  }, [skin])

  const set = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const save = async () => {
    if (!skin || !form) return
    if (!form.weapon.trim()) {
      toast.error('Weapon is required.')
      return
    }
    setSaving(true)
    try {
      const patch: UpdateSkinInput = {
        weapon: form.weapon.trim(),
        finish: form.finish.trim(),
        wear: (form.wear || null) as Wear | null,
        float_value: num(form.float_value),
        pattern: num(form.pattern),
        stattrak: form.stattrak,
        souvenir: form.souvenir,
        category: (form.category || null) as ItemCategory | null,
        purchase_source: form.purchase_source,
        purchase_date: form.purchase_date
          ? new Date(`${form.purchase_date}T12:00:00`).toISOString()
          : skin.purchase_date,
        purchase_price_inr: num(form.purchase_price_inr),
        purchase_price_usd: num(form.purchase_price_usd),
        purchase_price_empire: num(form.purchase_price_empire),
        purchase_exchange_rate: num(form.purchase_exchange_rate),
        purchase_empire_rate: num(form.purchase_empire_rate),
        notes: form.notes.trim() || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        favorite: form.favorite,
        pinned: form.pinned,
        skin_name: buildSkinName(form),
      }

      // The listing and sale blocks only render for the statuses that have them, so only
      // patch the side the user could actually see and change.
      if (skin.status === 'listed') {
        patch.list_source = (form.list_source || null) as SaleSource | null
        patch.list_date = isoDate(form.list_date)
        patch.list_price_inr = num(form.list_price_inr)
        patch.list_price_usd = num(form.list_price_usd)
        patch.list_price_empire = num(form.list_price_empire)
        patch.list_exchange_rate = num(form.list_exchange_rate)
        patch.list_empire_rate = num(form.list_empire_rate)
        patch.list_fee_percentage = num(form.list_fee_percentage)
      }
      if (skin.status === 'sold') {
        patch.sale_source = (form.sale_source || null) as SaleSource | null
        patch.sale_date = isoDate(form.sale_date)
        patch.sale_price_inr = num(form.sale_price_inr)
        patch.sale_price_usd = num(form.sale_price_usd)
        patch.sale_price_empire = num(form.sale_price_empire)
        patch.sale_exchange_rate = num(form.sale_exchange_rate)
        patch.sale_empire_rate = num(form.sale_empire_rate)
        patch.sale_fee_percentage = num(form.sale_fee_percentage)
      }

      const updated = await api.skins.update(skin.id, patch)
      if (updated) {
        onSaved(updated)
        toast.success('Changes saved.', { title: 'Skin updated' })
        onClose()
      }
    } catch {
      toast.error('Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!skin}
      onClose={onClose}
      title="Edit skin"
      description={skin ? skin.skin_name : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </>
      }
    >
      {form && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Weapon" required>
              <Input value={form.weapon} onChange={(e) => set('weapon', e.target.value)} />
            </Field>
            <Field label="Finish">
              <Input value={form.finish} onChange={(e) => set('finish', e.target.value)} />
            </Field>
            <Field label="Wear">
              <Select value={form.wear} onChange={(e) => set('wear', e.target.value)}>
                <option value="">— None —</option>
                {WEAR_VALUES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">— None —</option>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Float value" hint="0 – 1, up to 12 decimals">
              <Input
                type="number"
                step="0.000000000001"
                min="0"
                max="1"
                value={form.float_value}
                onChange={(e) => set('float_value', e.target.value)}
              />
            </Field>
            <Field label="Pattern">
              <Input
                type="number"
                step="1"
                min="0"
                max="1000"
                value={form.pattern}
                onChange={(e) => set('pattern', e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Toggle checked={form.stattrak} onChange={(v) => set('stattrak', v)} label="StatTrak™" />
            <Toggle checked={form.souvenir} onChange={(v) => set('souvenir', v)} label="Souvenir" />
            <Toggle checked={form.favorite} onChange={(v) => set('favorite', v)} label="Favorite" />
            <Toggle checked={form.pinned} onChange={(v) => set('pinned', v)} label="Pinned" />
          </div>

          <div className="border-t border-line/60" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purchase source">
              <Select
                value={form.purchase_source}
                onChange={(e) => set('purchase_source', e.target.value as PurchaseSource)}
              >
                {PURCHASE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Purchase date">
              <Input type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} />
            </Field>
            <Field label={`Cost (INR ${settings.currency_symbol})`}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price_inr}
                onChange={(e) => set('purchase_price_inr', e.target.value)}
              />
            </Field>
            <Field label="Cost (USD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price_usd}
                onChange={(e) => set('purchase_price_usd', e.target.value)}
              />
            </Field>
            <Field label="Cost (Empire coins)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price_empire}
                onChange={(e) => set('purchase_price_empire', e.target.value)}
              />
            </Field>
            <Field label="Exchange rate (USD → INR)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_exchange_rate}
                onChange={(e) => set('purchase_exchange_rate', e.target.value)}
              />
            </Field>
            <Field label="Empire coin rate (1 coin → INR)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_empire_rate}
                onChange={(e) => set('purchase_empire_rate', e.target.value)}
              />
            </Field>
          </div>

          {skin?.status === 'listed' && (
            <TradeFields
              legend="Listing"
              symbol={settings.currency_symbol}
              form={form}
              set={set}
              keys={{
                source: 'list_source',
                date: 'list_date',
                inr: 'list_price_inr',
                usd: 'list_price_usd',
                empire: 'list_price_empire',
                rate: 'list_exchange_rate',
                coin: 'list_empire_rate',
                fee: 'list_fee_percentage',
              }}
              dateLabel="Listed on"
              priceLabel="Ask price"
            />
          )}

          {skin?.status === 'sold' && (
            <TradeFields
              legend="Sale"
              symbol={settings.currency_symbol}
              form={form}
              set={set}
              keys={{
                source: 'sale_source',
                date: 'sale_date',
                inr: 'sale_price_inr',
                usd: 'sale_price_usd',
                empire: 'sale_price_empire',
                rate: 'sale_exchange_rate',
                coin: 'sale_empire_rate',
                fee: 'sale_fee_percentage',
              }}
              dateLabel="Sale date"
              priceLabel="Sale price"
            />
          )}

          <Field label="Tags" hint="Comma separated">
            <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  )
}

/** Which EditFormState keys this block reads and writes. */
interface TradeKeys {
  source: 'list_source' | 'sale_source'
  date: 'list_date' | 'sale_date'
  inr: 'list_price_inr' | 'sale_price_inr'
  usd: 'list_price_usd' | 'sale_price_usd'
  empire: 'list_price_empire' | 'sale_price_empire'
  rate: 'list_exchange_rate' | 'sale_exchange_rate'
  coin: 'list_empire_rate' | 'sale_empire_rate'
  fee: 'list_fee_percentage' | 'sale_fee_percentage'
}

/**
 * The listing- or sale-side columns of a skin, edited directly rather than re-derived
 * through priceBreakdown — that's what lets a historical trade keep the numbers and the
 * rates it was actually recorded at.
 */
function TradeFields({
  legend,
  symbol,
  form,
  set,
  keys,
  dateLabel,
  priceLabel,
}: {
  legend: string
  symbol: string
  form: EditFormState
  set: <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => void
  keys: TradeKeys
  dateLabel: string
  priceLabel: string
}) {
  return (
    <>
      <div className="border-t border-line/60" />
      <p className="text-xs font-medium uppercase tracking-wider text-faint">{legend}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Marketplace">
          <Select value={form[keys.source]} onChange={(e) => set(keys.source, e.target.value)}>
            <option value="">— None —</option>
            {SALE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dateLabel}>
          <Input type="date" value={form[keys.date]} onChange={(e) => set(keys.date, e.target.value)} />
        </Field>
        <Field label={`${priceLabel} (INR ${symbol})`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form[keys.inr]}
            onChange={(e) => set(keys.inr, e.target.value)}
          />
        </Field>
        <Field label={`${priceLabel} (USD)`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form[keys.usd]}
            onChange={(e) => set(keys.usd, e.target.value)}
          />
        </Field>
        <Field label={`${priceLabel} (Empire coins)`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form[keys.empire]}
            onChange={(e) => set(keys.empire, e.target.value)}
          />
        </Field>
        <Field label="Fees %">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            suffix="%"
            value={form[keys.fee]}
            onChange={(e) => set(keys.fee, e.target.value)}
          />
        </Field>
        <Field label="Exchange rate (USD → INR)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form[keys.rate]}
            onChange={(e) => set(keys.rate, e.target.value)}
          />
        </Field>
        <Field label="Empire coin rate (1 coin → INR)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form[keys.coin]}
            onChange={(e) => set(keys.coin, e.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs text-faint">
        INR is the figure every profit number is computed from — edit it if you change the {priceLabel.toLowerCase()}.
      </p>
    </>
  )
}
