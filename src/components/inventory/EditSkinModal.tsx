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
  WEAR_VALUES,
  type ItemCategory,
  type PurchaseSource,
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
    notes: skin.notes ?? '',
    tags: skin.tags.join(', '),
    favorite: skin.favorite,
    pinned: skin.pinned,
  }
}

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
        notes: form.notes.trim() || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        favorite: form.favorite,
        pinned: form.pinned,
        skin_name: buildSkinName(form),
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
            <Field label="Float value" hint="0 – 1">
              <Input
                type="number"
                step="0.0001"
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
          </div>

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
