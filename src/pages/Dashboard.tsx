import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Banknote,
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  LayoutDashboard,
  LineChart,
  PackagePlus,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingDown,
  Trophy,
  Wallet,
  WalletMinimal,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSettings } from '@/providers/SettingsProvider'
import { useToast } from '@/providers/ToastProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard, type Accent } from '@/components/ui/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkinName } from '@/components/skins/SkinName'
import {
  MonthlyFlowChart,
  MonthlyProfitChart,
  ProfitTimelineChart,
  SourceDonut,
} from '@/components/dashboard/DashboardCharts'
import { TopSkinsList } from '@/components/dashboard/TopSkinsList'
import { RecentList } from '@/components/dashboard/RecentList'
import { WithdrawalModal } from '@/components/dashboard/WithdrawalModal'
import { formatHoldingTime, formatPercent, formatSignedMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DashboardStats, TradeExtreme } from '@shared/models'

export default function Dashboard() {
  const navigate = useNavigate()
  const { money, moneyCompact, settings } = useSettings()
  const toast = useToast()
  const { data: stats, loading, refetch } = useAsyncData<DashboardStats>(() => api.dashboard.stats())
  const [seeding, setSeeding] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const isEmpty = stats != null && stats.ownedCount === 0 && stats.soldCount === 0

  const loadSample = async () => {
    setSeeding(true)
    try {
      const count = await api.dev.seed(true)
      await refetch()
      toast.success(`Loaded ${count} sample trades to explore.`, { title: 'Sample data ready' })
    } catch {
      toast.error('Could not load sample data.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Dashboard"
        subtitle="Your CS2 trading portfolio at a glance"
        actions={
          <Button variant="secondary" onClick={() => void refetch()} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {loading && !stats ? (
        <DashboardSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title="No trades yet"
          description="Add your first purchase to start tracking profit, or load a set of sample trades to explore everything the dashboard can do."
          className="py-20"
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onClick={() => navigate('/purchases')}>
                <PackagePlus className="h-4 w-4" />
                Add a purchase
              </Button>
              <Button variant="secondary" onClick={loadSample} loading={seeding}>
                <Sparkles className="h-4 w-4" />
                Load sample data
              </Button>
            </div>
          }
        />
      ) : stats ? (
        <>
          <DashboardContent
            stats={stats}
            money={money}
            moneyCompact={moneyCompact}
            symbol={settings.currency_symbol}
            onManageWithdrawals={() => setWithdrawOpen(true)}
          />
          <WithdrawalModal
            open={withdrawOpen}
            onClose={() => setWithdrawOpen(false)}
            realizedProfit={stats.realizedProfit}
            totalWithdrawn={stats.totalWithdrawn}
            availableBalance={stats.availableBalance}
            onChange={() => void refetch()}
          />
        </>
      ) : null}
    </div>
  )
}

function DashboardContent({
  stats,
  money,
  moneyCompact,
  symbol,
  onManageWithdrawals,
}: {
  stats: DashboardStats
  money: (n: number | null | undefined) => string
  moneyCompact: (n: number | null | undefined) => string
  symbol: string
  onManageWithdrawals: () => void
}) {
  const realizedAccent: Accent = stats.realizedProfit >= 0 ? 'success' : 'danger'
  const unrealizedAccent: Accent = stats.unrealizedProfit >= 0 ? 'success' : 'danger'
  const availablePositive = stats.availableBalance >= 0

  return (
    <div className="space-y-6">
      {/* Available balance = realized profit − withdrawals */}
      <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-surface/80 p-5 shadow-card">
        <div
          className={cn(
            'pointer-events-none absolute -right-10 -top-12 h-40 w-52 rounded-full blur-3xl',
            availablePositive ? 'bg-success/15' : 'bg-danger/15',
          )}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl',
                availablePositive ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger',
              )}
            >
              <WalletMinimal className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Available Balance
              </p>
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight [font-variant-numeric:tabular-nums]',
                  availablePositive ? 'text-content' : 'text-danger',
                )}
              >
                {money(stats.availableBalance)}
              </p>
              <p className="mt-0.5 text-xs text-faint">
                Realized {money(stats.realizedProfit)} − Withdrawn {money(stats.totalWithdrawn)}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onManageWithdrawals}>
            <Banknote className="h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* Headline KPIs */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Inventory Value"
          value={moneyCompact(stats.totalInventoryValue)}
          icon={Wallet}
          accent="brand"
          sublabel={`${stats.ownedCount} skins held`}
        />
        <StatCard
          index={1}
          label="Realized Profit"
          value={formatSignedMoney(stats.realizedProfit, symbol)}
          icon={Trophy}
          accent={realizedAccent}
          delta={stats.overallRoi}
          deltaLabel="overall ROI"
        />
        <StatCard
          index={2}
          label="Unrealized Profit"
          value={formatSignedMoney(stats.unrealizedProfit, symbol)}
          icon={LineChart}
          accent={unrealizedAccent}
          sublabel="on skins still held"
        />
        <StatCard
          index={3}
          label="Overall ROI"
          value={formatPercent(stats.overallRoi, { signed: true })}
          icon={Percent}
          accent={stats.overallRoi >= 0 ? 'gold' : 'danger'}
          sublabel="on closed trades"
        />
      </section>

      {/* Secondary KPIs */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard index={4} label="Total Purchase Cost" value={moneyCompact(stats.totalPurchaseCost)} icon={ShoppingCart} accent="info" />
        <StatCard index={5} label="Total Sold Value" value={moneyCompact(stats.totalSoldValue)} icon={Tag} accent="accent" />
        <StatCard index={6} label="Owned Skins" value={stats.ownedCount} icon={Boxes} accent="muted" sublabel="in inventory" />
        <StatCard index={7} label="Sold Skins" value={stats.soldCount} icon={CheckCircle2} accent="muted" sublabel="realized" />
      </section>

      {/* Tertiary KPIs */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard index={8} label="Avg Holding Time" value={formatHoldingTime(stats.avgHoldingDays)} icon={Clock} accent="brand" />
        <StatCard index={9} label="Avg Purchase Price" value={money(stats.avgPurchasePrice)} icon={Receipt} accent="info" />
        <StatCard index={10} label="Avg Sale Price" value={money(stats.avgSalePrice)} icon={Receipt} accent="accent" />
        <StatCard index={11} label="Total Fees Paid" value={money(stats.totalFeesPaid)} icon={Coins} accent="warning" />
      </section>

      {/* Best / worst trade */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <TradeHighlight variant="best" trade={stats.highestProfit} symbol={symbol} />
        <TradeHighlight variant="worst" trade={stats.biggestLoss} symbol={symbol} />
      </section>

      {/* Time-series charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Monthly Cashflow" subtitle="Purchases vs. sales" icon={<ShoppingCart className="h-4 w-4" />}>
          <MonthlyFlowChart data={stats.monthly} />
        </Panel>
        <Panel title="Monthly Profit" subtitle="Realized profit per month" icon={<Trophy className="h-4 w-4" />}>
          <MonthlyProfitChart data={stats.monthly} />
        </Panel>
      </section>

      <Panel title="Profit Timeline" subtitle="Cumulative realized profit" icon={<LineChart className="h-4 w-4" />}>
        <ProfitTimelineChart data={stats.profitTimeline} />
      </Panel>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Purchase Sources" subtitle="Where you buy, by spend" icon={<ShoppingCart className="h-4 w-4" />}>
          <SourceDonut data={stats.purchaseSources} empty="No purchases yet" />
        </Panel>
        <Panel title="Sale Sources" subtitle="Where you sell, by net proceeds" icon={<Tag className="h-4 w-4" />}>
          <SourceDonut data={stats.saleSources} empty="No sales yet" />
        </Panel>
      </section>

      {/* Lists */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Top 10 Most Profitable" subtitle="Your best closed trades" icon={<Trophy className="h-4 w-4" />}>
          <TopSkinsList items={stats.topProfitable} />
        </Panel>
        <Panel title="Recent Purchases" icon={<ShoppingCart className="h-4 w-4" />}>
          <RecentList items={stats.recentPurchases} empty="Add a purchase to see it here." />
        </Panel>
        <Panel title="Recent Sales" icon={<Tag className="h-4 w-4" />}>
          <RecentList items={stats.recentSales} empty="Sell a skin to see it here." />
        </Panel>
      </section>
    </div>
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
  const label = positive ? 'Highest Profit' : 'Biggest Loss'

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
        'flex items-center gap-4 overflow-hidden rounded-2xl border p-5',
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
        <SkinName weapon={trade.weapon} finish={trade.finish} className="mt-0.5" badges={false} />
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
      <Skeleton className="h-[320px]" />
    </div>
  )
}
