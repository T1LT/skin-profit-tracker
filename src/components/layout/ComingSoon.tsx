import type { LucideIcon } from 'lucide-react'
import { CircleDashed, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  features: string[]
  step: number
  upNext?: boolean
}

/**
 * Intentional placeholder for pages that are scheduled but not yet built. The
 * app is delivered page-by-page; this lists exactly what will land here so
 * navigation never dead-ends on a blank screen.
 */
export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
  description,
  features,
  step,
  upNext,
}: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader icon={<Icon className="h-5 w-5" />} title={title} subtitle={subtitle} />

      <Panel className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Icon className="h-8 w-8" />
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <Badge variant="brand">Build step {step} of 7</Badge>
            {upNext && (
              <Badge variant="gold">
                <Sparkles className="h-3 w-3" />
                Up next
              </Badge>
            )}
          </div>

          <h2 className="text-lg font-semibold text-content">This page is on the way</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>

          <div className="mt-7 w-full max-w-md text-left">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Planned for this page
            </p>
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-brand/70" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}
