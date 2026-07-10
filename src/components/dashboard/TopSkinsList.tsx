import { SkinName } from '@/components/skins/SkinName'
import { ChartEmpty } from '@/components/charts/ChartEmpty'
import { useSettings } from '@/providers/SettingsProvider'
import { formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TopSkin } from '@shared/models'

export function TopSkinsList({ items }: { items: TopSkin[] }) {
  const { settings } = useSettings()
  const symbol = settings.currency_symbol
  if (!items.length) return <ChartEmpty label="Sell some skins to see your best trades" />

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.profit)), 1)

  return (
    <ol className="space-y-3">
      {items.map((item, idx) => {
        const positive = item.profit >= 0
        const width = Math.max(4, (Math.abs(item.profit) / maxAbs) * 100)
        return (
          <li key={item.id} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-faint">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <SkinName
                  weapon={item.weapon}
                  finish={item.finish}
                  wear={item.wear}
                  stattrak={item.stattrak}
                  className="text-sm"
                />
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      'text-sm font-semibold [font-variant-numeric:tabular-nums]',
                      positive ? 'text-success' : 'text-danger',
                    )}
                  >
                    {formatSignedMoney(item.profit, symbol)}
                  </span>
                  <span className="ml-1.5 text-xs text-faint">{formatPercent(item.roi, { signed: true })}</span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn('h-full rounded-full', positive ? 'bg-success' : 'bg-danger')}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
