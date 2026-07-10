import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Accent = 'brand' | 'accent' | 'success' | 'danger' | 'warning' | 'gold' | 'info' | 'muted'

const ACCENTS: Record<Accent, { text: string; chip: string; glow: string }> = {
  brand: { text: 'text-brand', chip: 'bg-brand/10 text-brand', glow: 'from-brand/25' },
  accent: { text: 'text-accent', chip: 'bg-accent/10 text-accent', glow: 'from-accent/25' },
  success: { text: 'text-success', chip: 'bg-success/10 text-success', glow: 'from-success/25' },
  danger: { text: 'text-danger', chip: 'bg-danger/10 text-danger', glow: 'from-danger/25' },
  warning: { text: 'text-warning', chip: 'bg-warning/10 text-warning', glow: 'from-warning/25' },
  gold: { text: 'text-gold', chip: 'bg-gold/10 text-gold', glow: 'from-gold/25' },
  info: { text: 'text-info', chip: 'bg-info/10 text-info', glow: 'from-info/25' },
  muted: { text: 'text-muted', chip: 'bg-white/5 text-muted', glow: 'from-white/10' },
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  accent?: Accent
  sublabel?: ReactNode
  /** Signed number rendered as a trend pill (arrow + percent). */
  delta?: number | null
  deltaLabel?: string
  index?: number
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'brand',
  sublabel,
  delta,
  deltaLabel,
  index = 0,
  className,
}: StatCardProps) {
  const a = ACCENTS[accent]
  const hasDelta = delta != null && Number.isFinite(delta)
  const positive = (delta ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.4), ease: 'easeOut' }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line/70 bg-surface/80 p-4 shadow-card backdrop-blur-xl',
        'transition-colors hover:border-line',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-b to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100',
          a.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', a.chip)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="relative mt-2.5 text-2xl font-semibold tracking-tight text-content [font-variant-numeric:tabular-nums]">
        {value}
      </div>
      <div className="relative mt-1.5 flex items-center gap-2">
        {hasDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
              positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta as number).toFixed(1)}%
          </span>
        )}
        {(sublabel || deltaLabel) && (
          <span className="truncate text-xs text-faint">{deltaLabel ?? sublabel}</span>
        )}
      </div>
    </motion.div>
  )
}
