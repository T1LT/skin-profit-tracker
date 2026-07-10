import { cn } from '@/lib/utils'

/** App mark: a gradient shield with a crosshair-diamond, evoking skin trading. */
export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[0_6px_18px_-6px_rgb(var(--brand)/0.8)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2 3 7v6c0 5 3.5 7.5 9 9 5.5-1.5 9-4 9-9V7z" opacity={0.55} />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </div>
  )
}
