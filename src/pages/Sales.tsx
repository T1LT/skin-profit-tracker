import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PackagePlus, Pencil, Search, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebounced } from '@/hooks/useDebounced'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SkinName } from '@/components/skins/SkinName'
import { OwnedSkinCard } from '@/components/sales/OwnedSkinCard'
import { TradeModal, type TradeMode } from '@/components/sales/TradeModal'
import { computeTradeProfit } from '@shared/calculations'
import { formatDate, formatHoldingTime, formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skin, SkinFilter } from '@shared/models'

/** Which skin the trade modal is open on, and what it's doing to it. */
interface TradeTarget {
  skin: Skin
  mode: TradeMode
}

export default function Sales() {
  const navigate = useNavigate()
  const { money, settings } = useSettings()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [trade, setTrade] = useState<TradeTarget | null>(null)
  const debounced = useDebounced(search, 300)

  const ownedFilter = useMemo<SkinFilter>(
    () => ({
      status: 'owned',
      search: debounced.trim() || undefined,
      sortBy: 'purchase_date',
      sortDir: 'desc',
      limit: 500,
    }),
    [debounced],
  )
  const { data: owned, loading, refetch } = useAsyncData(() => api.skins.list(ownedFilter), [ownedFilter])

  const listedFilter = useMemo<SkinFilter>(
    () => ({
      status: 'listed',
      search: debounced.trim() || undefined,
      sortBy: 'list_date',
      sortDir: 'desc',
      limit: 500,
    }),
    [debounced],
  )
  const { data: listed, refetch: refetchListed } = useAsyncData(
    () => api.skins.list(listedFilter),
    [listedFilter],
  )

  const soldFilter = useMemo<SkinFilter>(
    () => ({ status: 'sold', sortBy: 'sale_date', sortDir: 'desc', limit: 8 }),
    [],
  )
  const { data: sold, refetch: refetchSold } = useAsyncData(() => api.skins.list(soldFilter), [soldFilter])

  const refetchAll = useCallback(async () => {
    await Promise.all([refetch(), refetchListed(), refetchSold()])
  }, [refetch, refetchListed, refetchSold])

  // Deep links from Inventory's row actions: /sales?sell=<id> and /sales?list=<id>
  useEffect(() => {
    const sellId = searchParams.get('sell')
    const listId = searchParams.get('list')
    if (!sellId && !listId) return
    let active = true
    const id = Number(sellId ?? listId)
    api.skins.get(id).then((s) => {
      if (!active || !s || s.status === 'sold') return
      setTrade({ skin: s, mode: sellId ? 'sell' : 'list' })
    })
    const next = new URLSearchParams(searchParams)
    next.delete('sell')
    next.delete('list')
    setSearchParams(next, { replace: true })
    return () => {
      active = false
    }
  }, [searchParams, setSearchParams])

  const handleUnlist = async (skin: Skin) => {
    try {
      await api.skins.unlist(skin.id)
      await refetchAll()
      toast.success('Listing removed.')
    } catch {
      toast.error('Could not unlist this skin.')
    }
  }

  const ownedRows = owned?.rows ?? []
  const listedRows = listed?.rows ?? []
  const soldRows = sold?.rows ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Tag className="h-5 w-5" />}
        title="Sales"
        subtitle={`${owned?.total ?? 0} ready to sell · ${listed?.total ?? 0} listed`}
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your skins…"
          className="input-base pl-9"
        />
      </div>

      {listedRows.length > 0 && (
        <Panel
          title="Currently listed"
          subtitle="On the market, waiting for a buyer"
          icon={<Tag className="h-4 w-4" />}
        >
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listedRows.map((skin) => (
              <OwnedSkinCard
                key={skin.id}
                skin={skin}
                onList={(s) => setTrade({ skin: s, mode: 'edit-list' })}
                onSell={(s) => setTrade({ skin: s, mode: 'sell' })}
                onUnlist={handleUnlist}
              />
            ))}
          </div>
        </Panel>
      )}

      {loading && !owned ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[152px]" />
          ))}
        </div>
      ) : ownedRows.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title={search ? 'No matching skins' : 'Nothing to sell yet'}
          description={
            search
              ? 'No owned skins match your search.'
              : 'Add some purchases to your inventory, then come back to list or sell them.'
          }
          className="py-16"
          action={
            !search ? (
              <Button variant="primary" onClick={() => navigate('/purchases')}>
                <PackagePlus className="h-4 w-4" />
                Add a purchase
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ownedRows.map((skin) => (
            <OwnedSkinCard
              key={skin.id}
              skin={skin}
              onList={(s) => setTrade({ skin: s, mode: 'list' })}
              onSell={(s) => setTrade({ skin: s, mode: 'sell' })}
            />
          ))}
        </div>
      )}

      {soldRows.length > 0 && (
        <Panel title="Recently sold" subtitle="Your latest closed trades" icon={<Tag className="h-4 w-4" />}>
          <ul className="-my-1 divide-y divide-line/50">
            {soldRows.map((skin) => (
              <SoldRow
                key={skin.id}
                skin={skin}
                symbol={settings.currency_symbol}
                money={money}
                onEdit={(s) => setTrade({ skin: s, mode: 'edit-sale' })}
              />
            ))}
          </ul>
        </Panel>
      )}

      <TradeModal
        skin={trade?.skin ?? null}
        mode={trade?.mode ?? 'sell'}
        onClose={() => setTrade(null)}
        onSaved={refetchAll}
      />
    </div>
  )
}

function SoldRow({
  skin,
  symbol,
  money,
  onEdit,
}: {
  skin: Skin
  symbol: string
  money: (n: number | null | undefined) => string
  onEdit: (skin: Skin) => void
}) {
  const pnl = computeTradeProfit({
    purchaseInr: skin.purchase_price_inr ?? 0,
    grossSaleInr: skin.sale_price_inr ?? 0,
    feePct: skin.sale_fee_percentage,
    purchaseDate: skin.purchase_date,
    saleDate: skin.sale_date,
  })
  const positive = pnl.profitInr >= 0

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <SkinName
          weapon={skin.weapon}
          finish={skin.finish}
          wear={skin.wear}
          stattrak={skin.stattrak}
          souvenir={skin.souvenir}
          className="text-sm"
        />
        <p className="mt-0.5 truncate text-xs text-faint">
          {skin.sale_source} · {formatDate(skin.sale_date)} · bought {money(skin.purchase_price_inr)} · held{' '}
          {formatHoldingTime(pnl.holdingDays)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p
            className={cn(
              'text-sm font-semibold [font-variant-numeric:tabular-nums]',
              positive ? 'text-success' : 'text-danger',
            )}
          >
            {formatSignedMoney(pnl.profitInr, symbol)}
          </p>
          <p className="text-xs text-faint">{formatPercent(pnl.roi, { signed: true })} ROI</p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(skin)}
          title="Edit this sale"
          aria-label="Edit this sale"
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-content"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
