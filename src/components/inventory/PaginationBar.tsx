import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface PaginationBarProps {
  pageIndex: number
  pageSize: number
  total: number
  onPageIndex: (index: number) => void
  onPageSize: (size: number) => void
}

const PAGE_SIZES = [25, 50, 100, 250]

export function PaginationBar({ pageIndex, pageSize, total, onPageIndex, onPageSize }: PaginationBarProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(total, (pageIndex + 1) * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-content">{start.toLocaleString()}</span>–
        <span className="font-medium text-content">{end.toLocaleString()}</span> of{' '}
        <span className="font-medium text-content">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-faint sm:inline">Rows</span>
        <div className="w-[76px]">
          <Select value={String(pageSize)} onChange={(e) => onPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled={pageIndex === 0} onClick={() => onPageIndex(0)} title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={pageIndex === 0}
            onClick={() => onPageIndex(pageIndex - 1)}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-muted">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageIndex(pageIndex + 1)}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageIndex(pageCount - 1)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
