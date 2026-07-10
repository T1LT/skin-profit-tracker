import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { ChartEmpty } from '@/components/charts/ChartEmpty'
import { CHART } from '@/components/charts/theme'
import { useSettings } from '@/providers/SettingsProvider'
import type { MarketplaceStat, RoiBucket, WeaponStat } from '@shared/models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tip = (valueFormatter: (v: number) => string, hideLabel?: boolean) => (props: any) =>
  <ChartTooltip {...props} valueFormatter={valueFormatter} hideLabel={hideLabel} />

const AXIS_TICK = { fill: CHART.axis, fontSize: 11 }

export function MarketplaceProfitChart({ data }: { data: MarketplaceStat[] }) {
  const { money, moneyCompact } = useSettings()
  if (!data.length) return <ChartEmpty label="No sales yet" />
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, left: -6, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="source" tickLine={false} axisLine={false} tick={AXIS_TICK} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={52} tickFormatter={moneyCompact} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Tooltip cursor={{ fill: CHART.cursor }} content={tip(money)} />
          <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? CHART.success : CHART.danger} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RoiDistributionChart({ data }: { data: RoiBucket[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <ChartEmpty label="No closed trades yet" />
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} allowDecimals={false} />
          <Tooltip cursor={{ fill: CHART.cursor }} content={tip((v) => `${v} trade${v === 1 ? '' : 's'}`)} />
          <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => {
              const negative = d.label.startsWith('<') || d.label.startsWith('-')
              return <Cell key={i} fill={negative ? CHART.danger : CHART.brand} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TopWeaponsChart({ data }: { data: WeaponStat[] }) {
  const { money, moneyCompact } = useSettings()
  if (!data.length) return <ChartEmpty label="No sales yet" />
  const height = Math.max(200, data.length * 40)
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" hide tickFormatter={moneyCompact} />
          <YAxis
            type="category"
            dataKey="weapon"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            width={92}
          />
          <Tooltip cursor={{ fill: CHART.cursor }} content={tip(money, true)} />
          <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? CHART.success : CHART.danger} />
            ))}
            <LabelList
              dataKey="profit"
              position="right"
              formatter={(value: number | string) => money(Number(value))}
              fill="#aeb6c9"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
