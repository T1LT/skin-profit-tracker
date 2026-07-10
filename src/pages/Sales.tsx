import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PackagePlus, Search, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/providers/SettingsProvider'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebounced } from '@/hooks/useDebounced'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SkinName } from '@/components/skins/SkinName'
import { OwnedSkinCard } from '@/components/sales/OwnedSkinCard'
import { SaleModal } from '@/components/sales/SaleModal'
import { computeTradeProfit } from '@shared/calculations'
import { formatDate, formatHoldingTime, formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skin, SkinFilter } from '@shared/models'

export default function Sales() {
  const navigate = useNavigate()
  const { money, settings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selling, setSelling] = useState<Skin | null>(null)
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

  const soldFilter = useMemo<SkinFilter>(
    () => ({ status: 'sold', sortBy: 'sale_date', sortDir: 'desc', limit: 8 }),
    [],
  )
  const { data: sold, refetch: refetchSold } = useAsyncData(() => api.skins.list(soldFilter), [soldFilter])

  // Deep link from Inventory's quick-sell: /sales?sell=<id>
  useEffect(() => {
    const id = searchParams.get('sell')
    if (!id) return
    let active = true
    api.skins.get(Number(id)).then((s) => {
      if (active && s && s.status === 'owned') setSelling(s)
    })
    const next = new URLSearchParams(searchParams)
    next.delete('sell')
    setSearchParams(next, { replace: true })
    return () => {
      active = false
    }
  }, [searchParams, setSearchParams])

  const handleSold = async () => {
    await Promise.all([refetch(), refetchSold()])
  }

  const ownedRows = owned?.rows ?? []
  const soldRows = sold?.rows ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Tag className="h-5 w-5" />}
        title="Sales"
        subtitle={`${owned?.total ?? 0} ${owned?.total === 1 ? 'skin' : 'skins'} ready to sell`}
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your owned skins…"
          className="input-base pl-9"
        />
      </div>

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
              : 'Add some purchases to your inventory, then come back to record sales.'
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
            <OwnedSkinCard key={skin.id} skin={skin} onSell={setSelling} />
          ))}
        </div>
      )}

      {soldRows.length > 0 && (
        <Panel title="Recently sold" subtitle="Your latest closed trades" icon={<Tag className="h-4 w-4" />}>
          <ul className="-my-1 divide-y divide-line/50">
            {soldRows.map((skin) => (
              <SoldRow key={skin.id} skin={skin} symbol={settings.currency_symbol} money={money} />
            ))}
          </ul>
        </Panel>
      )}

      <SaleModal skin={selling} onClose={() => setSelling(null)} onSold={handleSold} />
    </div>
  )
}

function SoldRow({
  skin,
  symbol,
  money,
}: {
  skin: Skin
  symbol: string
  money: (n: number | null | undefined) => string
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
      <div className="shrink-0 text-right">
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
    </li>
  )
}
