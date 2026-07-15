import { Check, Star, Store, Tag, Undo2 } from 'lucide-react'
import { SkinName } from '@/components/skins/SkinName'
import { useSettings } from '@/providers/SettingsProvider'
import { computeTradeProfit, daysBetween } from '@shared/calculations'
import { formatHoldingTime, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skin } from '@shared/models'

/**
 * A skin on the Sales page. An owned skin can be listed or sold outright; a listed one
 * shows what it's asking (and the profit that ask implies) and can be sold or pulled.
 */
export function OwnedSkinCard({
  skin,
  onList,
  onSell,
  onUnlist,
}: {
  skin: Skin
  onList: (skin: Skin) => void
  onSell: (skin: Skin) => void
  onUnlist?: (skin: Skin) => void
}) {
  const { money, settings } = useSettings()
  const heldDays = daysBetween(skin.purchase_date, new Date().toISOString())
  const listed = skin.status === 'listed'

  const projected = listed
    ? computeTradeProfit({
        purchaseInr: skin.purchase_price_inr ?? 0,
        grossSaleInr: skin.list_price_inr ?? 0,
        feePct: skin.list_fee_percentage,
      })
    : null

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border bg-surface/70 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
        listed ? 'border-warning/40' : 'border-line/70 hover:border-brand/40',
      )}
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
          <p className="text-[11px] uppercase tracking-wider text-faint">{listed ? 'Asking' : 'Cost'}</p>
          <p className="text-lg font-semibold text-content [font-variant-numeric:tabular-nums]">
            {money(listed ? skin.list_price_inr : skin.purchase_price_inr)}
          </p>
        </div>
        <div className="text-right text-xs text-faint">
          <p className="flex items-center justify-end gap-1">
            <Store className="h-3 w-3" />
            {listed ? skin.list_source : skin.purchase_source}
          </p>
          <p className="mt-0.5">Held {formatHoldingTime(heldDays)}</p>
        </div>
      </div>

      {projected && (
        <p className="mt-2 text-xs text-faint">
          Cost {money(skin.purchase_price_inr)} ·{' '}
          <span className={cn('font-medium', projected.profitInr >= 0 ? 'text-success' : 'text-danger')}>
            {formatSignedMoney(projected.profitInr, settings.currency_symbol)}
          </span>{' '}
          if it sells
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {listed ? (
          <>
            <CardAction onClick={() => onSell(skin)} tone="brand">
              <Check className="h-3.5 w-3.5" />
              Mark sold
            </CardAction>
            {onUnlist && (
              <CardAction onClick={() => onUnlist(skin)} tone="muted">
                <Undo2 className="h-3.5 w-3.5" />
                Unlist
              </CardAction>
            )}
          </>
        ) : (
          <>
            <CardAction onClick={() => onList(skin)} tone="brand">
              <Tag className="h-3.5 w-3.5" />
              List
            </CardAction>
            <CardAction onClick={() => onSell(skin)} tone="muted">
              <Check className="h-3.5 w-3.5" />
              Sell
            </CardAction>
          </>
        )}
      </div>
    </div>
  )
}

function CardAction({
  onClick,
  tone,
  children,
}: {
  onClick: () => void
  tone: 'brand' | 'muted'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
        tone === 'brand'
          ? 'bg-brand/10 text-brand hover:bg-brand/20'
          : 'bg-white/5 text-muted hover:bg-white/10 hover:text-content',
      )}
    >
      {children}
    </button>
  )
}
