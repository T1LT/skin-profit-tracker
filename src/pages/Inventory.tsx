import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getCoreRowModel,
  useReactTable,
  type ColumnSizingState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Boxes, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebounced } from '@/hooks/useDebounced'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { buildColumns } from '@/components/inventory/columns'
import { InventoryToolbar } from '@/components/inventory/InventoryToolbar'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { PaginationBar } from '@/components/inventory/PaginationBar'
import { EditSkinModal } from '@/components/inventory/EditSkinModal'
import type { PurchaseSource, Skin, SkinFilter } from '@shared/models'

export default function Inventory() {
  const navigate = useNavigate()
  const { money, settings } = useSettings()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [status, setStatus] = useState<'all' | 'owned' | 'listed' | 'sold'>('all')
  const [source, setSource] = useState<PurchaseSource | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  const [sorting, setSorting] = useState<SortingState>([{ id: 'purchase_date', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [editing, setEditing] = useState<Skin | null>(null)

  const undoStack = useRef<Skin[][]>([])
  const debouncedSearch = useDebounced(search, 300)

  // Reflect global-search navigations (?q=…) into the local search box.
  useEffect(() => {
    const q = searchParams.get('q')
    if (q != null) setSearch(q)
  }, [searchParams])

  const filter = useMemo<SkinFilter>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status,
      purchaseSource: source,
      dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      priceMin: priceMin !== '' ? Number(priceMin) : undefined,
      priceMax: priceMax !== '' ? Number(priceMax) : undefined,
      sortBy: (sorting[0]?.id as SkinFilter['sortBy']) ?? 'purchase_date',
      sortDir: sorting[0]?.desc ? 'desc' : 'asc',
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    }),
    [debouncedSearch, status, source, dateFrom, dateTo, priceMin, priceMax, sorting, pagination],
  )

  const { data, loading, refetch } = useAsyncData(() => api.skins.list(filter), [filter])
  const rows = useMemo(() => data?.rows ?? [], [data])
  const total = data?.total ?? 0

  // Any filter/sort change returns to the first page.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [debouncedSearch, status, source, dateFrom, dateTo, priceMin, priceMax, sorting])

  const selectedSkins = useMemo(
    () => rows.filter((r) => rowSelection[String(r.id)]),
    [rows, rowSelection],
  )

  const activeFilters = [source !== 'all', !!dateFrom, !!dateTo, priceMin !== '', priceMax !== ''].filter(
    Boolean,
  ).length

  /* ---------------------------- actions ---------------------------- */

  const undoLast = useCallback(async () => {
    const batch = undoStack.current.pop()
    if (!batch || batch.length === 0) return
    for (const skin of batch) {
      try {
        await api.skins.restore(skin)
      } catch {
        /* already restored or gone */
      }
    }
    await refetch()
    toast.success(batch.length === 1 ? 'Delete undone.' : `Restored ${batch.length} skins.`)
  }, [refetch, toast])

  const handleDelete = useCallback(
    async (skin: Skin) => {
      await api.skins.remove(skin.id)
      undoStack.current.push([skin])
      await refetch()
      toast.info(`Deleted ${skin.weapon}${skin.finish ? ` | ${skin.finish}` : ''}.`, {
        title: 'Skin deleted',
        action: { label: 'Undo', onClick: () => void undoLast() },
      })
    },
    [refetch, toast, undoLast],
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedSkins.length === 0) return
    await api.skins.bulkRemove(selectedSkins.map((s) => s.id))
    undoStack.current.push(selectedSkins)
    setRowSelection({})
    await refetch()
    toast.info(`Deleted ${selectedSkins.length} skins.`, {
      title: 'Bulk delete',
      action: { label: 'Undo', onClick: () => void undoLast() },
    })
  }, [selectedSkins, refetch, toast, undoLast])

  const handleDuplicate = useCallback(
    async (skin: Skin) => {
      const dup = await api.skins.duplicate(skin.id)
      await refetch()
      if (dup) toast.success('Duplicated as a new owned skin.')
    },
    [refetch, toast],
  )

  const handleReopen = useCallback(
    async (skin: Skin) => {
      await api.skins.reopen(skin.id)
      await refetch()
      toast.success('Skin re-opened — back to owned.')
    },
    [refetch, toast],
  )

  const handleToggleFavorite = useCallback(
    async (skin: Skin) => {
      await api.skins.update(skin.id, { favorite: !skin.favorite })
      await refetch()
    },
    [refetch],
  )

  const handleUnlist = useCallback(
    async (skin: Skin) => {
      await api.skins.unlist(skin.id)
      await refetch()
      toast.success('Listing removed — back to owned.')
    },
    [refetch, toast],
  )

  // Listing and selling both happen in the Sales page's trade modal.
  const handleSell = useCallback((skin: Skin) => navigate(`/sales?sell=${skin.id}`), [navigate])
  const handleList = useCallback((skin: Skin) => navigate(`/sales?list=${skin.id}`), [navigate])

  const columns = useMemo(
    () =>
      buildColumns({
        money,
        empireCoinInr: settings.empire_coin_inr,
        onEdit: setEditing,
        onDuplicate: handleDuplicate,
        onDelete: handleDelete,
        onList: handleList,
        onUnlist: handleUnlist,
        onSell: handleSell,
        onReopen: handleReopen,
        onToggleFavorite: handleToggleFavorite,
      }),
    [
      money,
      settings.empire_coin_inr,
      handleDuplicate,
      handleDelete,
      handleList,
      handleUnlist,
      handleSell,
      handleReopen,
      handleToggleFavorite,
    ],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination, columnVisibility, columnSizing, rowSelection },
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
    manualPagination: true,
    rowCount: total,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
  })

  // Delete key removes the selection; Ctrl+Z undoes the last delete.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        void undoLast()
      } else if (e.key === 'Delete' && !typing && selectedSkins.length > 0) {
        e.preventDefault()
        void handleBulkDelete()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undoLast, handleBulkDelete, selectedSkins.length])

  const clearFilters = () => {
    setSource('all')
    setDateFrom('')
    setDateTo('')
    setPriceMin('')
    setPriceMax('')
  }

  const hasQuery = !!search || activeFilters > 0 || status !== 'all'

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Boxes className="h-5 w-5" />}
        title="Inventory"
        subtitle={`${total.toLocaleString()} ${total === 1 ? 'skin' : 'skins'}`}
        actions={
          <Button variant="primary" onClick={() => navigate('/purchases')}>
            <Plus className="h-4 w-4" />
            Add skin
          </Button>
        }
      />

      <InventoryToolbar
        table={table}
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        source={source}
        onSource={setSource}
        dateFrom={dateFrom}
        dateTo={dateTo}
        priceMin={priceMin}
        priceMax={priceMax}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
        onPriceMin={setPriceMin}
        onPriceMax={setPriceMax}
        activeFilters={activeFilters}
        onClear={clearFilters}
      />

      {selectedSkins.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] px-4 py-2.5">
          <span className="text-sm font-medium text-content">
            {selectedSkins.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              Clear
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <InventoryTable
        table={table}
        onRowDoubleClick={setEditing}
        loading={loading}
        emptyLabel={hasQuery ? 'No skins match your filters' : 'No skins yet — add your first purchase'}
      />

      <PaginationBar
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        total={total}
        onPageIndex={(i) => setPagination((p) => ({ ...p, pageIndex: i }))}
        onPageSize={(s) => setPagination({ pageIndex: 0, pageSize: s })}
      />

      <EditSkinModal skin={editing} onClose={() => setEditing(null)} onSaved={() => void refetch()} />
    </div>
  )
}
