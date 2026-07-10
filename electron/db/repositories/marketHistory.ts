import { getDb } from '../database'
import type { MarketHistoryEntry } from '../../../shared/models'

export const marketHistoryRepo = {
  add(entry: Omit<MarketHistoryEntry, 'id'>): MarketHistoryEntry {
    const db = getDb()
    const info = db
      .prepare('INSERT INTO market_history (skin_id, market, price, date) VALUES (?, ?, ?, ?)')
      .run(entry.skin_id, entry.market, entry.price, entry.date)
    return { id: Number(info.lastInsertRowid), ...entry }
  },

  forSkin(skinId: number): MarketHistoryEntry[] {
    return getDb()
      .prepare('SELECT * FROM market_history WHERE skin_id = ? ORDER BY date ASC')
      .all(skinId) as MarketHistoryEntry[]
  },

  /** Map of skin_id -> most recent recorded market price (used for unrealised value). */
  latestPriceMap(): Map<number, number> {
    const rows = getDb()
      .prepare(
        `SELECT skin_id, price FROM market_history
         WHERE id IN (SELECT MAX(id) FROM market_history GROUP BY skin_id)`,
      )
      .all() as { skin_id: number; price: number }[]
    const map = new Map<number, number>()
    for (const r of rows) map.set(r.skin_id, r.price)
    return map
  },
}
