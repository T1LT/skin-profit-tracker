import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { NAV_ITEMS } from './navItems'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import { APP_NAME, APP_VERSION } from '@shared/constants'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === '1',
  )

  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', c ? '0' : '1')
      return !c
    })

  return (
    <aside
      className={cn(
        'relative z-20 flex shrink-0 flex-col border-r border-line/70 bg-bg-soft/70 backdrop-blur-xl transition-[width] duration-200 ease-out',
        collapsed ? 'w-[76px]' : 'w-[244px]',
      )}
    >
      {/* Brand */}
      <div className="flex h-[60px] items-center gap-3 px-4">
        <Logo size={36} className="shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-content">
              Skin Profit
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-faint">
              Tracker
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scroll-area flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted hover:bg-white/5 hover:text-content',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                  )}
                  <Icon className="h-[19px] w-[19px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-line/60 p-3">
        <button
          onClick={toggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-content',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className={cn('h-[19px] w-[19px] shrink-0 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && (
          <p className="mt-2 px-3 text-[11px] text-faint">
            {APP_NAME} · v{APP_VERSION}
          </p>
        )}
      </div>
    </aside>
  )
}
