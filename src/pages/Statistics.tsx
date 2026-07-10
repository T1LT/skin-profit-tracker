import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BarChart3,
  Clock,
  Coins,
  Crosshair,
  Download,
  PackagePlus,
  Percent,
  Sigma,
  Sparkles,
  Store,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { StatCard, type Accent } from '@/components/ui/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportablePanel } from '@/components/stats/ExportablePanel'
import {
  MarketplaceProfitChart,
  RoiDistributionChart,
  TopWeaponsChart,
} from '@/components/stats/StatsCharts'
import { exportAllCharts } from '@/lib/exportChart'
import { formatHoldingTime, formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Statistics as Stats, TradeExtreme } from '@shared/models'

const roiAccent = (v: number): Accent => (v >= 0 ? 'success' : 'danger')

export default function Statistics() {
  const navigate = useNavigate()
  const { money, settings } = useSettings()
  const toast = useToast()
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: stats, loading } = useAsyncData<Stats>(() => api.statistics.get())
  const [exporting, setExporting] = useState(false)

  const exportAll = async () => {
    if (!containerRef.current) return
    setExporting(true)
    try {
      const count = await exportAllCharts(containerRef.current)
      if (count > 0) toast.success(`Exported ${count} chart${count === 1 ? '' : 's'} as PNG.`)
      else toast.error('No charts with data to export yet.')
    } finally {
      setExporting(false)
    }
  }

  const symbol = settings.currency_symbol

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Statistics"
        subtitle="Advanced analytics on your trading"
        actions={
          stats && stats.totalTrades > 0 ? (
            <Button variant="secondary" onClick={exportAll} loading={exporting}>
              <Download className="h-4 w-4" />
              Export all PNG
            </Button>
          ) : undefined
        }
      />

      {loading && !stats ? (
        <StatsSkeleton />
      ) : !stats || stats.totalItems === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data to analyze yet"
          description="Add purchases and record some sales, then this page fills with win rate, ROI, per-marketplace performance and more."
          className="py-20"
          action={
            <Button variant="primary" onClick={() => navigate('/purchases')}>
              <PackagePlus className="h-4 w-4" />
              Add a purchase
            </Button>
          }
        />
      ) : (
        <div ref={containerRef} className="space-y-6">
          {/* KPI grid */}
          <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            <StatCard index={0} label="Total Trades" value={stats.totalTrades} icon={Swords} accent="brand" sublabel={`of ${stats.totalItems} items`} />
            <StatCard
              index={1}
              label="Win Rate"
              value={formatPercent(stats.winRate, { decimals: 0 })}
              icon={Target}
              accent={stats.winRate >= 50 ? 'success' : 'warning'}
              sublabel={`${stats.wins}W · ${stats.losses}L`}
            />
            <StatCard index={2} label="Average ROI" value={formatPercent(stats.averageRoi, { signed: true })} icon={TrendingUp} accent={roiAccent(stats.averageRoi)} />
            <StatCard index={3} label="Median ROI" value={formatPercent(stats.medianRoi, { signed: true })} icon={Sigma} accent={roiAccent(stats.medianRoi)} />
            <StatCard index={4} label="Avg Holding Days" value={formatHoldingTime(stats.averageHoldingDays)} icon={Clock} accent="info" />
            <StatCard index={5} label="Avg Fees Paid" value={money(stats.averageFeesPaid)} icon={Coins} accent="warning" sublabel="per sale" />
            <StatCard
              index={6}
              label="Most Traded Weapon"
              value={<NameValue value={stats.mostTradedWeapon?.name} />}
              icon={Crosshair}
              accent="accent"
              sublabel={stats.mostTradedWeapon ? `${stats.mostTradedWeapon.count} items` : undefined}
            />
            <StatCard
              index={7}
              label="Most Profitable Weapon"
              value={<NameValue value={stats.mostProfitableWeapon?.name} />}
              icon={Award}
              accent="gold"
              sublabel={stats.mostProfitableWeapon ? formatSignedMoney(stats.mostProfitableWeapon.profit, symbol) : undefined}
            />
            <StatCard
              index={8}
              label="Most Profitable Finish"
              value={<NameValue value={stats.mostProfitableFinish?.name} />}
              icon={Sparkles}
              accent="success"
              sublabel={stats.mostProfitableFinish ? formatSignedMoney(stats.mostProfitableFinish.profit, symbol) : undefined}
            />
          </section>

          {/* Best / worst */}
          <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <TradeHighlight variant="best" trade={stats.bestTrade} symbol={symbol} />
            <TradeHighlight variant="worst" trade={stats.worstTrade} symbol={symbol} />
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExportablePanel
              title="Profit by Marketplace"
              subtitle="Realized profit per sale venue"
              icon={<Store className="h-4 w-4" />}
              exportName="profit-by-marketplace"
            >
              <MarketplaceProfitChart data={stats.profitByMarketplace} />
            </ExportablePanel>
            <ExportablePanel
              title="ROI Distribution"
              subtitle="How your trades' returns spread out"
              icon={<Percent className="h-4 w-4" />}
              exportName="roi-distribution"
            >
              <RoiDistributionChart data={stats.roiDistribution} />
            </ExportablePanel>
          </section>

          <ExportablePanel
            title="Top Weapons by Profit"
            subtitle="Your most profitable weapons"
            icon={<Trophy className="h-4 w-4" />}
            exportName="top-weapons"
          >
            <TopWeaponsChart data={stats.topWeapons} />
          </ExportablePanel>
        </div>
      )}
    </div>
  )
}

function NameValue({ value }: { value?: string }) {
  return (
    <span className="block truncate text-lg" title={value ?? undefined}>
      {value ?? '—'}
    </span>
  )
}

function TradeHighlight({
  variant,
  trade,
  symbol,
}: {
  variant: 'best' | 'worst'
  trade: TradeExtreme | null
  symbol: string
}) {
  const positive = variant === 'best'
  const Icon = positive ? Trophy : TrendingDown
  const label = positive ? 'Best Trade Ever' : 'Worst Trade Ever'

  if (!trade) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-line/70 bg-surface/60 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-faint">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-0.5 text-sm text-faint">No closed trades yet</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center gap-4 rounded-2xl border p-5',
        positive ? 'border-success/25 bg-success/[0.06]' : 'border-danger/25 bg-danger/[0.06]',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 truncate font-medium text-content">
          {trade.weapon}
          {trade.finish ? <span className="text-muted"> | {trade.finish}</span> : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('text-lg font-semibold [font-variant-numeric:tabular-nums]', positive ? 'text-success' : 'text-danger')}>
          {formatSignedMoney(trade.profit, symbol)}
        </p>
        <p className="text-xs text-faint">{formatPercent(trade.roi, { signed: true })} ROI</p>
      </div>
    </motion.div>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
    </div>
  )
}
