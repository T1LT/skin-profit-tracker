import { SkinName } from '@/components/skins/SkinName'
import { EmptyState } from '@/components/ui/EmptyState'
import { sourceColor } from '@/components/charts/theme'
import { useSettings } from '@/providers/SettingsProvider'
import { formatRelative } from '@/lib/format'
import { PackageOpen } from 'lucide-react'
import type { RecentSkin } from '@shared/models'

export function RecentList({ items, empty }: { items: RecentSkin[]; empty: string }) {
  const { money } = useSettings()

  if (!items.length) {
    return <EmptyState icon={PackageOpen} title="Nothing here yet" description={empty} className="border-0 py-10" />
  }

  return (
    <ul className="-my-1 divide-y divide-line/50">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span
            className="h-8 w-1 shrink-0 rounded-full"
            style={{ background: sourceColor(item.source) }}
          />
          <div className="min-w-0 flex-1">
            <SkinName
              weapon={item.weapon}
              finish={item.finish}
              wear={item.wear}
              stattrak={item.stattrak}
              souvenir={item.souvenir}
            />
            <p className="mt-0.5 truncate text-xs text-faint">
              {item.source} · {formatRelative(item.date)}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-content [font-variant-numeric:tabular-nums]">
            {money(item.price)}
          </span>
        </li>
      ))}
    </ul>
  )
}
