import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Columns3, Filter, Search, X } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { Field } from '@/components/ui/Field'
import { COLUMN_LABELS } from './columns'
import { PURCHASE_SOURCES, type PurchaseSource, type Skin } from '@shared/models'
import { cn } from '@/lib/utils'

interface InventoryToolbarProps {
  table: Table<Skin>
  search: string
  onSearch: (v: string) => void
  status: 'all' | 'owned' | 'listed' | 'sold'
  onStatus: (v: 'all' | 'owned' | 'listed' | 'sold') => void
  source: PurchaseSource | 'all'
  onSource: (v: PurchaseSource | 'all') => void
  dateFrom: string
  dateTo: string
  priceMin: string
  priceMax: string
  onDateFrom: (v: string) => void
  onDateTo: (v: string) => void
  onPriceMin: (v: string) => void
  onPriceMax: (v: string) => void
  activeFilters: number
  onClear: () => void
}

const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'owned' as const, label: 'Owned' },
  { value: 'listed' as const, label: 'Listed' },
  { value: 'sold' as const, label: 'Sold' },
]

export function InventoryToolbar(props: InventoryToolbarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)

  const hideableColumns = props.table
    .getAllLeafColumns()
    .filter((c) => c.id in COLUMN_LABELS)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Search weapon, finish, wear, pattern, notes…"
            className="input-base pl-9"
          />
          {props.search && (
            <button
              onClick={() => props.onSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-content"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <SegmentedControl options={STATUS_OPTIONS} value={props.status} onChange={props.onStatus} size="sm" />

        <div className="w-[150px]">
          <Select value={props.source} onChange={(e) => props.onSource(e.target.value as PurchaseSource | 'all')}>
            <option value="all">All sources</option>
            {PURCHASE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <Button
          variant={showFilters || props.activeFilters > 0 ? 'secondary' : 'outline'}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {props.activeFilters > 0 && <Badge variant="brand">{props.activeFilters}</Badge>}
        </Button>

        <Button variant={showColumns ? 'secondary' : 'outline'} onClick={() => setShowColumns((v) => !v)}>
          <Columns3 className="h-4 w-4" />
          Columns
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-line/70 bg-surface/50 p-4 sm:grid-cols-4">
              <Field label="From date">
                <Input type="date" value={props.dateFrom} onChange={(e) => props.onDateFrom(e.target.value)} />
              </Field>
              <Field label="To date">
                <Input type="date" value={props.dateTo} onChange={(e) => props.onDateTo(e.target.value)} />
              </Field>
              <Field label="Min price (INR)">
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={props.priceMin}
                  onChange={(e) => props.onPriceMin(e.target.value)}
                />
              </Field>
              <Field label="Max price (INR)">
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Any"
                  value={props.priceMax}
                  onChange={(e) => props.onPriceMax(e.target.value)}
                />
              </Field>
              {props.activeFilters > 0 && (
                <div className="col-span-2 sm:col-span-4">
                  <Button variant="ghost" size="sm" onClick={props.onClear}>
                    <X className="h-3.5 w-3.5" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {showColumns && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-x-6 gap-y-2.5 rounded-xl border border-line/70 bg-surface/50 p-4">
              {hideableColumns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => column.toggleVisibility(!column.getIsVisible())}
                  className={cn(
                    'flex items-center gap-2 text-sm transition-colors',
                    column.getIsVisible() ? 'text-content' : 'text-faint',
                  )}
                >
                  <Checkbox checked={column.getIsVisible()} onChange={() => column.toggleVisibility()} />
                  {COLUMN_LABELS[column.id]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
