import { format, parseISO } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { ChartEmpty } from '@/components/charts/ChartEmpty'
import { CHART, sourceColor } from '@/components/charts/theme'
import { useSettings } from '@/providers/SettingsProvider'
import type { MonthlyPoint, SourceSlice, TimelinePoint } from '@shared/models'

// Recharts accepts a function as tooltip content; this keeps typing painless.
const tip =
  (valueFormatter: (v: number) => string, labelFormatter?: (l: string | number) => string, hideLabel?: boolean) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (props: any) =>
    (
      <ChartTooltip
        {...props}
        valueFormatter={valueFormatter}
        labelFormatter={labelFormatter}
        hideLabel={hideLabel}
      />
    )

const AXIS_TICK = { fill: CHART.axis, fontSize: 11 }

export function MonthlyFlowChart({ data }: { data: MonthlyPoint[] }) {
  const { money, moneyCompact } = useSettings()
  if (!data.length) return <ChartEmpty />
  return (
    <div>
      <ChartLegend
        items={[
          { label: 'Purchases', color: CHART.categorical[0] },
          { label: 'Sales', color: CHART.categorical[1] },
        ]}
      />
      <div className="mt-3 h-[248px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }} barGap={2} barCategoryGap="26%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} dy={6} minTickGap={12} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={52} tickFormatter={moneyCompact} />
            <Tooltip cursor={{ fill: CHART.cursor }} content={tip(money, (l) => `Month · ${l}`)} />
            <Bar dataKey="purchases" name="Purchases" fill={CHART.categorical[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="sales" name="Sales" fill={CHART.categorical[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MonthlyProfitChart({ data }: { data: MonthlyPoint[] }) {
  const { money, moneyCompact } = useSettings()
  if (!data.length) return <ChartEmpty />
  return (
    <div className="h-[248px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} dy={6} minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={52} tickFormatter={moneyCompact} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Tooltip cursor={{ fill: CHART.cursor }} content={tip(money, (l) => `Month · ${l}`)} />
          <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? CHART.success : CHART.danger} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProfitTimelineChart({ data }: { data: TimelinePoint[] }) {
  const { money, moneyCompact } = useSettings()
  if (data.length < 2) return <ChartEmpty label="Sell a few skins to build a profit timeline" />
  return (
    <div className="h-[248px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="profit-timeline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            dy={6}
            minTickGap={28}
            interval="preserveStartEnd"
            tickFormatter={(d: string) => format(parseISO(d), 'd MMM')}
          />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={52} tickFormatter={moneyCompact} />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeOpacity: 0.4 }}
            content={tip(money, (d) => format(parseISO(String(d)), 'd MMM yyyy'))}
          />
          <Area
            type="monotone"
            dataKey="cumulativeProfit"
            name="Cumulative profit"
            stroke={CHART.brand}
            strokeWidth={2}
            fill="url(#profit-timeline)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SourceDonut({ data, empty }: { data: SourceSlice[]; empty?: string }) {
  const { money, moneyCompact } = useSettings()
  if (!data.length) return <ChartEmpty label={empty ?? 'No data yet'} />
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[172px] w-[172px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="source"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.source} fill={sourceColor(d.source)} />
              ))}
            </Pie>
            <Tooltip content={tip(money, undefined, true)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wider text-faint">Total</span>
          <span className="text-lg font-semibold text-content">{moneyCompact(total)}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 self-stretch">
        {data.map((d) => (
          <li key={d.source} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: sourceColor(d.source) }} />
              <span className="truncate">{d.source}</span>
              <span className="text-faint">· {d.count}</span>
            </span>
            <span className="shrink-0 font-medium text-content [font-variant-numeric:tabular-nums]">
              {money(d.value)}
              <span className="ml-1 text-xs text-faint">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
