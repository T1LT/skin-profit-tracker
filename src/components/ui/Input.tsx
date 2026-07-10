import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  error?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div
          className={cn(
            'flex items-center rounded-xl border border-line bg-bg-soft/80 transition-colors focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/25',
            error && 'border-danger/70 focus-within:border-danger/70 focus-within:ring-danger/20',
          )}
        >
          {prefix && <span className="pl-3 text-sm text-faint">{prefix}</span>}
          <input
            ref={ref}
            className={cn(
              'w-full bg-transparent px-3 py-2.5 text-sm text-content placeholder:text-faint focus:outline-none',
              className,
            )}
            {...props}
          />
          {suffix && <span className="pr-3 text-sm text-faint">{suffix}</span>}
        </div>
      )
    }
    return (
      <input
        ref={ref}
        className={cn(
          'input-base',
          error && 'border-danger/70 focus:border-danger/70 focus:ring-danger/20',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
