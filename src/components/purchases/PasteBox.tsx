import { AlertTriangle, ClipboardPaste, Eraser } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import type { ListingSource } from '@shared/parsers'

interface PasteBoxProps {
  source: 'CSFloat' | 'CSGOEmpire'
  value: string
  onChange: (value: string) => void
  warnings: string[]
  mismatch: ListingSource | null
  onUseDetected: (source: ListingSource) => void
}

const PLACEHOLDERS: Record<PasteBoxProps['source'], string> = {
  CSFloat: '★ Specialist Gloves | Fade (Field-Tested)\nPrice\n192',
  CSGOEmpire: '[FN] ★ Gut Knife\nDoppler - Phase 4\n~0.015\nPrice\n200.66',
}

export function PasteBox({ source, value, onChange, warnings, mismatch, onUseDetected }: PasteBoxProps) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ClipboardPaste className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-content">Paste from {source}</p>
            <p className="text-xs text-faint">The details below fill in automatically.</p>
          </div>
        </div>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')} type="button">
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDERS[source]}
        className="min-h-[104px] font-mono text-[13px] leading-relaxed"
        spellCheck={false}
        autoFocus
      />

      {mismatch && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This looks like a {mismatch} listing.
          </span>
          <Button variant="ghost" size="sm" type="button" onClick={() => onUseDetected(mismatch)}>
            Switch to {mismatch}
          </Button>
        </div>
      )}

      {value.trim() && warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-xs text-faint">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning/70" />
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
