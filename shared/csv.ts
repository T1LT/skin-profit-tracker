/** Escape a single CSV value (RFC 4180). */
export function escapeCsvValue(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Turn a 2D array into CSV text (CRLF line endings for maximum compatibility). */
export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}
