import { useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // App-wide keyboard shortcuts. Page-specific ones (save, delete, undo) are
  // registered by the individual pages.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey
      if (!meta) return
      const key = event.key.toLowerCase()
      if (key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (key === 'n') {
        event.preventDefault()
        navigate('/purchases')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="app-backdrop flex min-w-0 flex-1 flex-col">
          <Topbar searchInputRef={searchInputRef} />
          <main className="scroll-area flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
