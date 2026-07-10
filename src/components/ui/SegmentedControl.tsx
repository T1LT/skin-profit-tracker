import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  fluid?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  fluid,
}: SegmentedControlProps<T>) {
  const layoutId = useId()
  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-line/70 bg-bg-soft/60 p-1',
        fluid && 'flex w-full',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
              fluid && 'flex-1',
              active ? 'text-white' : 'text-muted hover:text-content',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-brand-gradient shadow-[0_4px_14px_-6px_rgb(var(--brand)/0.8)]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
