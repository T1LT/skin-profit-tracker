import { useEffect, useState, type ReactNode } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

function WinButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void
  label: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-full w-[46px] items-center justify-center text-muted transition-colors',
        danger ? 'hover:bg-danger hover:text-white' : 'hover:bg-white/10 hover:text-content',
      )}
    >
      {children}
    </button>
  )
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    api.window.isMaximized().then(setMaximized).catch(() => undefined)
    return api.window.onMaximizeChange(setMaximized)
  }, [])

  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-line/60 bg-bg-soft/90 pl-4 backdrop-blur-xl">
      <span className="text-[11px] font-medium uppercase tracking-widest text-faint">
        Skin Profit Tracker
      </span>
      <div className="no-drag flex h-full">
        <WinButton onClick={() => void api.window.minimize()} label="Minimize">
          <Minus className="h-4 w-4" />
        </WinButton>
        <WinButton onClick={() => void api.window.toggleMaximize()} label="Maximize">
          {maximized ? <Copy className="h-[13px] w-[13px]" /> : <Square className="h-[13px] w-[13px]" />}
        </WinButton>
        <WinButton onClick={() => void api.window.close()} label="Close" danger>
          <X className="h-4 w-4" />
        </WinButton>
      </div>
    </div>
  )
}
