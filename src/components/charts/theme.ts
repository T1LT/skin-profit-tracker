/**
 * Chart palette. The categorical hues are the validated dark-mode set from the
 * data-viz reference palette, in their CVD-optimised slot order (blue, aqua,
 * yellow, green, violet, red, magenta, orange). Colour follows the entity, so
 * these are assigned by fixed order and never cycled/repainted.
 */
export const CHART = {
  categorical: [
    '#3987e5', // blue
    '#199e70', // aqua
    '#c98500', // yellow
    '#008300', // green
    '#9085e9', // violet
    '#e66767', // red
    '#d55181', // magenta
    '#d95926', // orange
  ],
  brand: '#6d8bff',
  accent: '#9580ff',
  success: '#2dc878',
  danger: '#f2616d',
  gold: '#d6ae5a',
  grid: 'rgba(150,160,184,0.10)',
  axis: '#68728a',
  cursor: 'rgba(150,160,184,0.12)',
} as const

/** Deterministic categorical colour for the nth entity. */
export function seriesColor(index: number): string {
  return CHART.categorical[index % CHART.categorical.length]
}

/** Stable colour per named marketplace so a source keeps its hue everywhere. */
const SOURCE_ORDER = ['CSFloat', 'CSGOEmpire', 'Empire', 'Skinport', 'BUFF', 'Steam', 'Manual', 'Other']
export function sourceColor(source: string): string {
  const idx = SOURCE_ORDER.indexOf(source)
  return seriesColor(idx >= 0 ? idx : SOURCE_ORDER.length)
}
