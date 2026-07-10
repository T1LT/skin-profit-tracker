interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string | number) => string
  hideLabel?: boolean
}

/** Shared, theme-aware tooltip for every Recharts chart in the app. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
  labelFormatter,
  hideLabel,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="min-w-[140px] rounded-xl border border-line/70 bg-surface-2/95 px-3 py-2 shadow-card-hover backdrop-blur-xl">
      {!hideLabel && label != null && (
        <p className="mb-1.5 text-xs font-medium text-muted">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.color ?? 'currentColor' }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-content [font-variant-numeric:tabular-nums]">
              {typeof entry.value === 'number' ? valueFormatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
