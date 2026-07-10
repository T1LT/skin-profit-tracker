import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Withdrawal } from '@shared/models'

const todayInput = () => new Date().toISOString().slice(0, 10)

interface WithdrawalModalProps {
  open: boolean
  onClose: () => void
  realizedProfit: number
  totalWithdrawn: number
  availableBalance: number
  onChange: () => void
}

export function WithdrawalModal({
  open,
  onClose,
  realizedProfit,
  totalWithdrawn,
  availableBalance,
  onChange,
}: WithdrawalModalProps) {
  const { money, settings } = useSettings()
  const toast = useToast()
  const { data: withdrawals, refetch } = useAsyncData<Withdrawal[]>(() => api.withdrawals.list())

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInput())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = withdrawals ?? []
  const amt = Number(amount)
  const projected = availableBalance - (Number.isFinite(amt) && amt > 0 ? amt : 0)

  const add = async () => {
    if (!(amt > 0)) {
      toast.error('Enter an amount greater than 0.')
      return
    }
    setSaving(true)
    try {
      await api.withdrawals.create({
        amount: amt,
        date: new Date(`${date}T12:00:00`).toISOString(),
        note: note.trim() || null,
      })
      setAmount('')
      setNote('')
      setDate(todayInput())
      await refetch()
      onChange()
      toast.success(`Withdrew ${money(amt)}.`, { title: 'Withdrawal recorded' })
    } catch {
      toast.error('Could not record the withdrawal.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (w: Withdrawal) => {
    try {
      await api.withdrawals.remove(w.id)
      await refetch()
      onChange()
      toast.info(`Removed withdrawal of ${money(w.amount)}.`)
    } catch {
      toast.error('Could not remove the withdrawal.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Withdrawals"
      description="Available balance = realized profit − withdrawals"
      size="md"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-line/60 bg-bg-soft/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Realized profit</span>
            <span className="font-medium text-content [font-variant-numeric:tabular-nums]">
              {money(realizedProfit)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-muted">Total withdrawn</span>
            <span className="font-medium text-danger [font-variant-numeric:tabular-nums]">
              −{money(totalWithdrawn)}
            </span>
          </div>
          <div className="my-2.5 border-t border-line/50" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-content">Available balance</span>
            <span
              className={cn(
                'text-lg font-semibold [font-variant-numeric:tabular-nums]',
                availableBalance >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {money(availableBalance)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Amount" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              prefix={settings.currency_symbol}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note">
            <Input placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        {amt > 0 && (
          <p className="text-xs text-muted">
            Available after this withdrawal:{' '}
            <span className={cn('font-semibold', projected >= 0 ? 'text-success' : 'text-danger')}>
              {money(projected)}
            </span>
          </p>
        )}

        <Button variant="primary" onClick={add} loading={saving} className="w-full">
          <Plus className="h-4 w-4" />
          Add withdrawal
        </Button>

        {rows.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">History</p>
            <ul className="max-h-64 divide-y divide-line/50 overflow-y-auto rounded-xl border border-line/60 scroll-area">
              {rows.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 bg-bg-soft/30 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-content [font-variant-numeric:tabular-nums]">
                      {money(w.amount)}
                    </p>
                    <p className="truncate text-xs text-faint">
                      {formatDate(w.date)}
                      {w.note ? ` · ${w.note}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(w)}
                    title="Remove withdrawal"
                    className="rounded-md p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
