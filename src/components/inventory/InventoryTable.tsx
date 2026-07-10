import { useRef } from 'react'
import { flexRender, type Table } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown, PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Skin } from '@shared/models'

interface InventoryTableProps {
  table: Table<Skin>
  onRowDoubleClick: (skin: Skin) => void
  loading?: boolean
  emptyLabel?: string
}

const ROW_HEIGHT = 44

export function InventoryTable({ table, onRowDoubleClick, loading, emptyLabel }: InventoryTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const totalWidth = table.getTotalSize()
  const isEmpty = !loading && rows.length === 0

  return (
    <div
      ref={containerRef}
      className="scroll-area relative h-[calc(100vh-21rem)] min-h-[380px] overflow-auto rounded-xl border border-line/70 bg-surface/50"
    >
      <div style={{ width: totalWidth }} className="min-w-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur-xl">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex border-b border-line/70">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const align = header.column.columnDef.meta?.align
                return (
                  <div
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      'relative flex items-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted',
                      align === 'right' && 'justify-end',
                    )}
                  >
                    {!header.isPlaceholder && (
                      <button
                        type="button"
                        disabled={!canSort}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'flex items-center gap-1',
                          canSort && 'cursor-pointer hover:text-content',
                          align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          ))}
                      </button>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 cursor-col-resize touch-none select-none rounded-full bg-transparent hover:bg-brand/60',
                          header.column.getIsResizing() && 'bg-brand',
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={row.id}
                onDoubleClick={() => onRowDoubleClick(row.original)}
                style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                className={cn(
                  'absolute left-0 top-0 flex w-full cursor-default items-center border-b border-line/30 transition-colors hover:bg-white/[0.03]',
                  row.getIsSelected() && 'bg-brand/[0.06]',
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align
                  return (
                    <div
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(
                        'flex items-center overflow-hidden px-3 text-sm',
                        align === 'right' && 'justify-end',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 top-11 flex flex-col items-center justify-center gap-2 text-faint">
          <PackageOpen className="h-9 w-9 opacity-50" />
          <p className="text-sm">{emptyLabel ?? 'No skins found'}</p>
        </div>
      )}
    </div>
  )
}
