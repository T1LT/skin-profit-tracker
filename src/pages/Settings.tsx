import { useEffect, useState } from 'react'
import {
  Check,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FolderOpen,
  HardDriveDownload,
  Palette,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CSV_KINDS, type BackupInfo, type CsvKind } from '@shared/models'

const THEMES = [
  { id: 'midnight', name: 'Midnight', swatch: ['#0a0c12', '#6d8bff', '#2dc878'] },
  { id: 'oled', name: 'OLED Black', swatch: ['#030408', '#7492ff', '#30d07e'] },
  { id: 'steel', name: 'Steel Blue', swatch: ['#0f141c', '#5b94ff', '#34c87e'] },
]

const CSV_LABELS: Record<CsvKind, string> = {
  inventory: 'Inventory',
  purchases: 'Purchases',
  sales: 'Sales',
  profit: 'Profit report',
  statistics: 'Statistics',
}

type Pending =
  | { kind: 'import' }
  | { kind: 'reset' }
  | { kind: 'restore'; path: string; name: string }
  | null

export default function Settings() {
  const { settings, update, refresh } = useSettings()
  const toast = useToast()
  const { data: backups, refetch: refetchBackups } = useAsyncData<BackupInfo[]>(() => api.backup.list())

  const [prefs, setPrefs] = useState({
    exchange_rate: String(settings.exchange_rate),
    empire_coin_inr: String(settings.empire_coin_inr),
    default_currency: settings.default_currency,
    default_fee_percentage: String(settings.default_fee_percentage),
    currency_symbol: settings.currency_symbol,
  })
  const [rateTab, setRateTab] = useState<'usd' | 'empire'>('usd')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPrefs({
      exchange_rate: String(settings.exchange_rate),
      empire_coin_inr: String(settings.empire_coin_inr),
      default_currency: settings.default_currency,
      default_fee_percentage: String(settings.default_fee_percentage),
      currency_symbol: settings.currency_symbol,
    })
  }, [
    settings.exchange_rate,
    settings.empire_coin_inr,
    settings.default_currency,
    settings.default_fee_percentage,
    settings.currency_symbol,
  ])

  const savePrefs = async () => {
    const rate = Number(prefs.exchange_rate)
    const coinInr = Number(prefs.empire_coin_inr)
    const fee = Number(prefs.default_fee_percentage)
    if (!(rate > 0)) return toast.error('USD exchange rate must be greater than 0.')
    if (!(coinInr > 0)) return toast.error('CSGOEmpire coin rate must be greater than 0.')
    if (!(fee >= 0 && fee <= 100)) return toast.error('Default fee must be between 0 and 100%.')
    if (!prefs.currency_symbol.trim()) return toast.error('Currency symbol is required.')
    setSavingPrefs(true)
    try {
      await update({
        exchange_rate: rate,
        empire_coin_inr: coinInr,
        default_currency: prefs.default_currency,
        default_fee_percentage: fee,
        currency_symbol: prefs.currency_symbol.trim(),
      })
      toast.success('Preferences saved.')
    } finally {
      setSavingPrefs(false)
    }
  }

  const createBackupNow = async () => {
    try {
      await api.backup.create()
      await refetchBackups()
      toast.success('Backup created.', { title: 'Backup completed', desktop: true })
    } catch {
      toast.error('Could not create a backup.')
    }
  }

  const changeBackupFolder = async () => {
    const folder = await api.backup.chooseFolder()
    if (folder) {
      await update({ backup_location: folder })
      await refetchBackups()
      toast.success('Backup folder updated.')
    }
  }

  const exportJson = async () => {
    const res = await api.data.exportJson()
    if (!res.canceled) toast.success('Database exported.', { title: 'Export complete', desktop: true })
  }

  const exportCsv = async (kind: CsvKind) => {
    const res = await api.data.exportCsv(kind)
    if (!res.canceled) toast.success(`${CSV_LABELS[kind]} exported to CSV.`)
  }

  const runPending = async () => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === 'reset') {
        await api.data.reset()
        toast.success('All data cleared.', { title: 'Database reset' })
      } else if (pending.kind === 'import') {
        const res = await api.data.importJson()
        if (!res.canceled) {
          await refresh()
          await refetchBackups()
          toast.success(`Imported ${res.count ?? 0} skins.`, { title: 'Import successful', desktop: true })
        }
      } else if (pending.kind === 'restore') {
        await api.backup.restore(pending.path)
        await refresh()
        toast.success('Backup restored.', { title: 'Restore complete', desktop: true })
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const confirmMeta =
    pending?.kind === 'reset'
      ? {
          title: 'Reset database?',
          message:
            'This permanently deletes every skin and all history. This cannot be undone — export a backup first if you might need it.',
          label: 'Reset everything',
        }
      : pending?.kind === 'import'
        ? {
            title: 'Import database?',
            message:
              'Importing replaces ALL of your current data with the contents of the file you choose next. Consider exporting a backup first.',
            label: 'Choose file & import',
          }
        : pending?.kind === 'restore'
          ? {
              title: 'Restore this backup?',
              message: `This replaces all current data with the backup from ${pending.name}.`,
              label: 'Restore backup',
            }
          : { title: '', message: '', label: 'Confirm' }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title="Settings"
        subtitle="Preferences, backups and data"
      />

      {/* Preferences */}
      <Panel title="Preferences" subtitle="Defaults used across the app" icon={<Sliders className="h-4 w-4" />}>
        <div className="space-y-5">
          {/* Conversion rates — separate tab per currency */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Conversion rates</p>
            <SegmentedControl
              options={[
                { value: 'usd', label: 'USD' },
                { value: 'empire', label: 'CSGOEmpire' },
              ]}
              value={rateTab}
              onChange={setRateTab}
              size="sm"
            />
            <div className="mt-3 max-w-xs">
              {rateTab === 'usd' ? (
                <Field label="1 USD = INR" hint="Used to convert USD prices">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    prefix={settings.currency_symbol}
                    value={prefs.exchange_rate}
                    onChange={(e) => setPrefs((p) => ({ ...p, exchange_rate: e.target.value }))}
                  />
                </Field>
              ) : (
                <Field label="1 CSGOEmpire coin = INR" hint="Used to convert Empire coin prices">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    prefix={settings.currency_symbol}
                    value={prefs.empire_coin_inr}
                    onChange={(e) => setPrefs((p) => ({ ...p, empire_coin_inr: e.target.value }))}
                  />
                </Field>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Default currency</p>
            <SegmentedControl
              options={[
                { value: 'EMPIRE' as const, label: 'Empire coins' },
                { value: 'USD' as const, label: 'USD' },
                { value: 'INR' as const, label: 'INR' },
              ]}
              value={prefs.default_currency}
              onChange={(v) => setPrefs((p) => ({ ...p, default_currency: v }))}
              size="sm"
            />
            <p className="mt-2 text-xs text-faint">
              Pre-selected when you list, sell, or manually add a skin. Pasted listings still use the
              marketplace's own currency.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default marketplace fee %">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                suffix="%"
                value={prefs.default_fee_percentage}
                onChange={(e) => setPrefs((p) => ({ ...p, default_fee_percentage: e.target.value }))}
              />
            </Field>
            <Field label="Currency symbol">
              <Input
                maxLength={3}
                value={prefs.currency_symbol}
                onChange={(e) => setPrefs((p) => ({ ...p, currency_symbol: e.target.value }))}
              />
            </Field>
          </div>
        </div>
        <div className="mt-5">
          <Button variant="primary" onClick={savePrefs} loading={savingPrefs}>
            <Save className="h-4 w-4" />
            Save preferences
          </Button>
        </div>
      </Panel>

      {/* Appearance */}
      <Panel title="Appearance" subtitle="Pick a theme" icon={<Palette className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((theme) => {
            const active = settings.theme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id })}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-4 text-left transition-colors',
                  active ? 'border-brand bg-brand/[0.08]' : 'border-line/70 hover:border-line',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {theme.swatch.map((c) => (
                      <span key={c} className="h-6 w-3.5 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-content">{theme.name}</span>
                </div>
                {active && <Check className="h-4 w-4 text-brand" />}
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Backups */}
      <Panel title="Backups" subtitle="Automatic daily snapshots, latest 30 kept" icon={<HardDriveDownload className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Toggle
              checked={settings.auto_backup}
              onChange={(v) => update({ auto_backup: v })}
              label="Automatic daily backup"
              description="Creates one snapshot per day on launch"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-bg-soft/40 p-3">
            <FolderOpen className="h-4 w-4 shrink-0 text-faint" />
            <span className="min-w-0 flex-1 truncate text-sm text-muted" title={settings.backup_location ?? undefined}>
              {settings.backup_location ?? 'Default app data folder'}
            </span>
            <Button variant="outline" size="sm" onClick={changeBackupFolder}>
              Change
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void api.backup.openFolder()}>
              Open
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={createBackupNow}>
              <HardDriveDownload className="h-4 w-4" />
              Create backup now
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Recent backups</p>
            {backups && backups.length > 0 ? (
              <ul className="divide-y divide-line/50 overflow-hidden rounded-xl border border-line/60">
                {backups.slice(0, 8).map((b) => (
                  <li key={b.path} className="flex items-center justify-between gap-3 bg-bg-soft/30 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Clock className="h-4 w-4 shrink-0 text-faint" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-content">{formatDateTime(b.createdAt)}</p>
                        <p className="text-xs text-faint">{(b.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPending({ kind: 'restore', path: b.path, name: formatDateTime(b.createdAt) })}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line/60 px-4 py-6 text-center text-sm text-faint">
                No backups yet.
              </p>
            )}
          </div>
        </div>
      </Panel>

      {/* Data management */}
      <Panel title="Data" subtitle="Import, export and reset" icon={<Database className="h-4 w-4" />}>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Full database (JSON)</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportJson}>
                <Download className="h-4 w-4" />
                Export database
              </Button>
              <Button variant="secondary" onClick={() => setPending({ kind: 'import' })}>
                <Upload className="h-4 w-4" />
                Import database
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Export to CSV</p>
            <div className="flex flex-wrap gap-2">
              {CSV_KINDS.map((kind) => (
                <Button key={kind} variant="outline" size="sm" onClick={() => exportCsv(kind)}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {CSV_LABELS[kind]}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-danger/25 bg-danger/[0.05] p-4">
            <p className="text-sm font-semibold text-content">Danger zone</p>
            <p className="mt-1 text-xs text-muted">
              Permanently delete all skins and history. Export a backup first if unsure.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setPending({ kind: 'reset' })}>
              <Trash2 className="h-3.5 w-3.5" />
              Reset database
            </Button>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={!!pending}
        title={confirmMeta.title}
        message={confirmMeta.message}
        confirmLabel={confirmMeta.label}
        danger
        loading={busy}
        onConfirm={runPending}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
