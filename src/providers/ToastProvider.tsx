import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, uid } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  action?: ToastAction
}

interface ToastAction {
  label: string
  onClick: () => void
}

interface PushOptions {
  title?: string
  variant?: ToastVariant
  /** Also fire a native OS desktop notification. */
  desktop?: boolean
  duration?: number
  /** An inline button, e.g. "Undo". */
  action?: ToastAction
}

interface ToastContextValue {
  push: (message: string, opts?: PushOptions) => void
  success: (message: string, opts?: PushOptions) => void
  error: (message: string, opts?: PushOptions) => void
  info: (message: string, opts?: PushOptions) => void
  warning: (message: string, opts?: PushOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof Info; accent: string; ring: string }
> = {
  success: { icon: CheckCircle2, accent: 'text-success', ring: 'shadow-[0_0_0_1px_rgb(var(--success)/0.4)]' },
  error: { icon: XCircle, accent: 'text-danger', ring: 'shadow-[0_0_0_1px_rgb(var(--danger)/0.4)]' },
  warning: { icon: AlertTriangle, accent: 'text-warning', ring: 'shadow-[0_0_0_1px_rgb(var(--warning)/0.4)]' },
  info: { icon: Info, accent: 'text-brand', ring: 'shadow-[0_0_0_1px_rgb(var(--brand)/0.4)]' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message: string, opts: PushOptions = {}) => {
      const id = uid('toast')
      const variant = opts.variant ?? 'info'
      setToasts((prev) =>
        [...prev, { id, message, variant, title: opts.title, action: opts.action }].slice(-4),
      )
      const duration = opts.duration ?? (opts.action ? 6500 : 4200)
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
      if (opts.desktop) {
        void api?.app.notify(opts.title ?? 'Skin Profit Tracker', message)
      }
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (m, o) => push(m, { ...o, variant: 'success' }),
      error: (m, o) => push(m, { ...o, variant: 'error' }),
      info: (m, o) => push(m, { ...o, variant: 'info' }),
      warning: (m, o) => push(m, { ...o, variant: 'warning' }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const meta = VARIANT_META[toast.variant]
            const Icon = meta.icon
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-xl border border-line/70 bg-surface-2/95 p-3.5 backdrop-blur-xl',
                  meta.ring,
                )}
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', meta.accent)} />
                <div className="min-w-0 flex-1">
                  {toast.title && (
                    <p className="text-sm font-semibold text-content">{toast.title}</p>
                  )}
                  <p className="text-sm text-muted">{toast.message}</p>
                  {toast.action && (
                    <button
                      onClick={() => {
                        toast.action?.onClick()
                        dismiss(toast.id)
                      }}
                      className="mt-1.5 text-xs font-semibold text-brand transition-colors hover:text-content"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 text-faint transition-colors hover:bg-white/5 hover:text-content"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
