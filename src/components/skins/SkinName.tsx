import { Badge, WearBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Wear } from '@shared/models'

interface SkinNameProps {
  weapon: string
  finish?: string
  wear?: Wear | null
  stattrak?: boolean
  souvenir?: boolean
  badges?: boolean
  className?: string
}

/** Consistent skin identity: "Weapon | Finish" with StatTrak/Souvenir/wear badges. */
export function SkinName({
  weapon,
  finish,
  wear,
  stattrak,
  souvenir,
  badges = true,
  className,
}: SkinNameProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className="truncate font-medium text-content">
        {weapon}
        {finish ? <span className="text-muted"> | {finish}</span> : null}
      </span>
      {badges && stattrak && (
        <Badge variant="gold" title="StatTrak™">
          ST
        </Badge>
      )}
      {badges && souvenir && (
        <Badge variant="warning" title="Souvenir">
          SV
        </Badge>
      )}
      {badges && wear && <WearBadge wear={wear} />}
    </div>
  )
}
