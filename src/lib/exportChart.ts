/**
 * Export a chart (the first <svg> inside `container`) to a downloaded PNG.
 * Fully offline: serialise the SVG, rasterise it onto a canvas, trigger a
 * download. A solid background is painted so the PNG isn't transparent.
 */
export async function exportChartPng(
  container: HTMLElement,
  filename: string,
  background = '#12151f',
): Promise<void> {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('No chart found to export')

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  const svgString = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const img = new Image()
    img.width = width
    img.height = height
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not render chart image'))
      img.src = url
    })

    const scale = 2 // crisp on hi-dpi displays
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable')
    ctx.scale(scale, scale)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Export every chart tagged with data-export-name inside `root`. Returns the count. */
export async function exportAllCharts(root: HTMLElement, background?: string): Promise<number> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-export-name]'))
  let count = 0
  for (const node of nodes) {
    const name = node.getAttribute('data-export-name') || 'chart'
    try {
      await exportChartPng(node, name, background)
      count++
    } catch {
      /* skip charts with no data */
    }
  }
  return count
}
