import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, Pencil, Star, Tag, Trash2, Undo2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge, WearBadge } from '@/components/ui/Badge'
import { inrToEmpire } from '@shared/calculations'
import { formatDate, formatFloatValue, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skin, SkinStatus } from '@shared/models'

export interface InventoryColumnHandlers {
  money: (n: number | null | undefined) => string
  /** Live coin→INR rate, for skins that were never priced in coins. */
  empireCoinInr: number
  onEdit: (skin: Skin) => void
  onDuplicate: (skin: Skin) => void
  onDelete: (skin: Skin) => void
  onList: (skin: Skin) => void
  onUnlist: (skin: Skin) => void
  onSell: (skin: Skin) => void
  onReopen: (skin: Skin) => void
  onToggleFavorite: (skin: Skin) => void
}

const STATUS_BADGE: Record<SkinStatus, { label: string; variant: 'brand' | 'warning' | 'success' }> = {
  owned: { label: 'Owned', variant: 'brand' },
  listed: { label: 'Listed', variant: 'warning' },
  sold: { label: 'Sold', variant: 'success' },
}

/** Human-friendly labels for the column-visibility menu. */
export const COLUMN_LABELS: Record<string, string> = {
  status: 'Status',
  weapon: 'Weapon',
  finish: 'Finish',
  wear: 'Wear',
  float_value: 'Float',
  pattern: 'Pattern',
  purchase_source: 'Source',
  purchase_price_usd: 'USD price',
  purchase_price_inr: 'INR price',
  purchase_price_empire: 'Empire price',
  purchase_date: 'Purchase date',
  notes: 'Notes',
}

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/10',
        danger ? 'hover:text-danger' : 'hover:text-content',
      )}
    >
      {children}
    </button>
  )
}

export function buildColumns(h: InventoryColumnHandlers): ColumnDef<Skin>[] {
  return [
    {
      id: 'select',
      size: 40,
      enableResizing: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={(v) => table.toggleAllPageRowsSelected(v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={(v) => row.toggleSelected(v)}
        />
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 96,
      cell: ({ row }) => {
        const badge = STATUS_BADGE[row.original.status] ?? STATUS_BADGE.owned
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      id: 'weapon',
      accessorKey: 'weapon',
      header: 'Weapon',
      size: 190,
      cell: ({ row }) => {
        const skin = row.original
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              title={skin.favorite ? 'Unfavorite' : 'Favorite'}
              onClick={(e) => {
                e.stopPropagation()
                h.onToggleFavorite(skin)
              }}
              className={cn('shrink-0', skin.favorite ? 'text-gold' : 'text-faint hover:text-gold')}
            >
              <Star className={cn('h-3.5 w-3.5', skin.favorite && 'fill-current')} />
            </button>
            <span className="truncate font-medium text-content">{skin.weapon}</span>
            {skin.stattrak && <Badge variant="gold">ST</Badge>}
            {skin.souvenir && <Badge variant="warning">SV</Badge>}
          </div>
        )
      },
    },
    {
      id: 'finish',
      accessorKey: 'finish',
      header: 'Finish',
      size: 150,
      cell: ({ row }) => <span className="truncate text-muted">{row.original.finish || '—'}</span>,
    },
    {
      id: 'wear',
      accessorKey: 'wear',
      header: 'Wear',
      size: 90,
      cell: ({ row }) => <WearBadge wear={row.original.wear} />,
    },
    {
      id: 'float_value',
      accessorKey: 'float_value',
      header: 'Float',
      size: 96,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted">{formatFloatValue(row.original.float_value)}</span>
      ),
    },
    {
      id: 'pattern',
      accessorKey: 'pattern',
      header: 'Pattern',
      size: 88,
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums text-muted">{row.original.pattern ?? '—'}</span>,
    },
    {
      id: 'purchase_source',
      accessorKey: 'purchase_source',
      header: 'Source',
      size: 130,
      cell: ({ row }) => <Badge variant="muted">{row.original.purchase_source}</Badge>,
    },
    {
      id: 'purchase_price_usd',
      accessorKey: 'purchase_price_usd',
      header: 'USD',
      size: 100,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted">
          {row.original.purchase_price_usd != null ? formatUsd(row.original.purchase_price_usd) : '—'}
        </span>
      ),
    },
    {
      id: 'purchase_price_inr',
      accessorKey: 'purchase_price_inr',
      header: 'INR',
      size: 120,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-medium tabular-nums text-content">{h.money(row.original.purchase_price_inr)}</span>
      ),
    },
    {
      id: 'purchase_price_empire',
      accessorKey: 'purchase_price_empire',
      header: 'Empire',
      size: 110,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const skin = row.original
        // Coins are stored only for skins actually bought with them. Everything else is
        // converted from INR at the rate frozen on the row, falling back to the live one,
        // so the column reads in coins no matter where the skin came from.
        const coins =
          skin.purchase_price_empire ??
          (skin.purchase_price_inr != null
            ? inrToEmpire(skin.purchase_price_inr, skin.purchase_empire_rate ?? h.empireCoinInr)
            : null)
        return (
          <span className="tabular-nums text-muted">
            {coins != null ? `${coins.toLocaleString('en-US')} c` : '—'}
          </span>
        )
      },
    },
    {
      id: 'purchase_date',
      accessorKey: 'purchase_date',
      header: 'Purchased',
      size: 118,
      cell: ({ row }) => <span className="text-muted">{formatDate(row.original.purchase_date)}</span>,
    },
    {
      id: 'notes',
      accessorKey: 'notes',
      header: 'Notes',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="truncate text-muted" title={row.original.notes ?? ''}>
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 168,
      enableResizing: false,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const skin = row.original
        return (
          <div className="flex items-center justify-end gap-0.5">
            <IconButton title="Edit" onClick={() => h.onEdit(skin)}>
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton title="Duplicate" onClick={() => h.onDuplicate(skin)}>
              <Copy className="h-3.5 w-3.5" />
            </IconButton>
            {skin.status === 'owned' && (
              <>
                <IconButton title="List for sale" onClick={() => h.onList(skin)}>
                  <Tag className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton title="Sell" onClick={() => h.onSell(skin)}>
                  <Check className="h-3.5 w-3.5" />
                </IconButton>
              </>
            )}
            {skin.status === 'listed' && (
              <>
                <IconButton title="Mark sold" onClick={() => h.onSell(skin)}>
                  <Check className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton title="Unlist" onClick={() => h.onUnlist(skin)}>
                  <Undo2 className="h-3.5 w-3.5" />
                </IconButton>
              </>
            )}
            {skin.status === 'sold' && (
              <IconButton title="Re-open (mark owned)" onClick={() => h.onReopen(skin)}>
                <Undo2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <IconButton title="Delete" danger onClick={() => h.onDelete(skin)}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        )
      },
    },
  ]
}
