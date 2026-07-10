import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('card', className)} {...props} />
  ),
)
Card.displayName = 'Card'

interface PanelProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

/** A titled card used for chart sections and list widgets. */
export function Panel({ title, subtitle, action, icon, className, bodyClassName, children }: PanelProps) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="truncate text-[15px] font-semibold text-content">{title}</h3>}
              {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </Card>
  )
}
