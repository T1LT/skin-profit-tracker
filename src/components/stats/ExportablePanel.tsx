import { useRef, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { Panel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/providers/ToastProvider'
import { exportChartPng } from '@/lib/exportChart'

interface ExportablePanelProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  exportName: string
  children: ReactNode
}

export function ExportablePanel({ title, subtitle, icon, exportName, children }: ExportablePanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const doExport = async () => {
    if (!ref.current) return
    try {
      await exportChartPng(ref.current, exportName)
      toast.success('Chart saved as PNG.')
    } catch {
      toast.error('Nothing to export yet.')
    }
  }

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      icon={icon}
      action={
        <Button variant="ghost" size="icon" onClick={doExport} title="Export as PNG">
          <Download className="h-4 w-4" />
        </Button>
      }
    >
      <div ref={ref} data-export-name={exportName}>
        {children}
      </div>
    </Panel>
  )
}
