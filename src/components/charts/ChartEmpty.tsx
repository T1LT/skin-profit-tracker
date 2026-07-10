import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChartEmpty({ label = 'No data yet', className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-[220px] w-full flex-col items-center justify-center gap-2 text-faint',
        className,
      )}
    >
      <BarChart3 className="h-8 w-8 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
