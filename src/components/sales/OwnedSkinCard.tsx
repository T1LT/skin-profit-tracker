import { Star, Store, Tag } from 'lucide-react'
import { SkinName } from '@/components/skins/SkinName'
import { useSettings } from '@/providers/SettingsProvider'
import { daysBetween } from '@shared/calculations'
import { formatHoldingTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skin } from '@shared/models'

export function OwnedSkinCard({ skin, onSell }: { skin: Skin; onSell: (skin: Skin) => void }) {
  const { money } = useSettings()
  const heldDays = daysBetween(skin.purchase_date, new Date().toISOString())

  return (
    <button
      type="button"
      onClick={() => onSell(skin)}
      className="group flex flex-col rounded-2xl border border-line/70 bg-surface/70 p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <SkinName
          weapon={skin.weapon}
          finish={skin.finish}
          wear={skin.wear}
          stattrak={skin.stattrak}
          souvenir={skin.souvenir}
          className="text-sm"
        />
        {skin.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-gold" />}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-faint">Cost</p>
          <p className="text-lg font-semibold text-content [font-variant-numeric:tabular-nums]">
            {money(skin.purchase_price_inr)}
          </p>
        </div>
        <div className="text-right text-xs text-faint">
          <p className="flex items-center justify-end gap-1">
            <Store className="h-3 w-3" />
            {skin.purchase_source}
          </p>
          <p className="mt-0.5">Held {formatHoldingTime(heldDays)}</p>
        </div>
      </div>

      <div
        className={cn(
          'mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-2 text-sm font-medium text-brand transition-colors group-hover:bg-brand/20',
        )}
      >
        <Tag className="h-3.5 w-3.5" />
        Sell this skin
      </div>
    </button>
  )
}
