import { useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSettings } from '@/providers/SettingsProvider'

export function Topbar({ searchInputRef }: { searchInputRef: RefObject<HTMLInputElement> }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [query, setQuery] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
  }

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-line/60 bg-bg-soft/40 px-6 py-3 backdrop-blur-xl">
      <form onSubmit={submit} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skins, weapons, notes…"
          className="input-base pl-9 pr-16"
          aria-label="Global search"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-faint">
          Ctrl F
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-1.5 rounded-lg border border-line/70 bg-surface/60 px-3 py-1.5 text-xs text-muted sm:flex">
          <span className="text-faint">1 USD</span>
          <span className="font-semibold text-content">
            {settings.currency_symbol}
            {settings.exchange_rate.toFixed(2)}
          </span>
        </div>
        <Button variant="primary" onClick={() => navigate('/purchases')}>
          <Plus className="h-4 w-4" />
          New Purchase
        </Button>
      </div>
    </header>
  )
}
