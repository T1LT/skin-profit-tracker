import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'input-base min-h-[80px] resize-y leading-relaxed',
        error && 'border-danger/70 focus:border-danger/70 focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
