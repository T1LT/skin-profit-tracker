import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  className?: string
  'aria-label'?: string
}

export function Checkbox({ checked, indeterminate, onChange, className, ...rest }: CheckboxProps) {
  const active = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-transparent hover:border-muted',
        className,
      )}
      {...rest}
    >
      {indeterminate ? <Minus className="h-3 w-3" /> : checked ? <Check className="h-3 w-3" /> : null}
    </button>
  )
}
