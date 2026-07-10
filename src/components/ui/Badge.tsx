import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { WEAR_SHORT, type Wear } from '@shared/models'

type BadgeVariant =
  | 'default'
  | 'brand'
  | 'success'
  | 'danger'
  | 'warning'
  | 'gold'
  | 'info'
  | 'muted'
  | 'outline'

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-muted border-transparent',
  brand: 'bg-brand/15 text-brand border-brand/20',
  success: 'bg-success/15 text-success border-success/20',
  danger: 'bg-danger/15 text-danger border-danger/20',
  warning: 'bg-warning/15 text-warning border-warning/25',
  gold: 'bg-gold/15 text-gold border-gold/25',
  info: 'bg-info/15 text-info border-info/20',
  muted: 'bg-surface-3/70 text-muted border-transparent',
  outline: 'bg-transparent text-muted border-line',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

const WEAR_VARIANT: Record<Wear, BadgeVariant> = {
  'Factory New': 'success',
  'Minimal Wear': 'info',
  'Field-Tested': 'brand',
  'Well-Worn': 'warning',
  'Battle-Scarred': 'danger',
}

export function WearBadge({ wear, full = false }: { wear: Wear | null; full?: boolean }) {
  if (!wear) return null
  return (
    <Badge variant={WEAR_VARIANT[wear]} title={wear}>
      {full ? wear : WEAR_SHORT[wear]}
    </Badge>
  )
}
