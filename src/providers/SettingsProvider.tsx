import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { DEFAULT_SETTINGS } from '@shared/constants'
import type { AppSettings } from '@shared/models'

interface SettingsContextValue {
  settings: AppSettings
  loading: boolean
  refresh: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<AppSettings>
  money: (amount: number | null | undefined, opts?: { decimals?: number }) => string
  moneyCompact: (amount: number | null | undefined) => string
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const AVAILABLE_THEMES = new Set(['midnight', 'oled', 'steel'])

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await api.settings.get()
    setSettings(next)
  }, [])

  useEffect(() => {
    let active = true
    api.settings
      .get()
      .then((s) => {
        if (active) setSettings(s)
      })
      .catch(() => {
        /* fall back to defaults */
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Apply the theme to <html data-theme> whenever it changes.
  useEffect(() => {
    const theme = AVAILABLE_THEMES.has(settings.theme) ? settings.theme : 'midnight'
    document.documentElement.setAttribute('data-theme', theme)
  }, [settings.theme])

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await api.settings.update(patch)
    setSettings(next)
    return next
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      refresh,
      update,
      money: (amount, opts) => formatMoney(amount, settings.currency_symbol, opts),
      moneyCompact: (amount) => formatMoneyCompact(amount, settings.currency_symbol),
    }),
    [settings, loading, refresh, update],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
