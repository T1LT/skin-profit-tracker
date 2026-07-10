import { getDb } from '../database'
import { roundMoney } from '../../../shared/calculations'
import type { CreateWithdrawalInput, Withdrawal } from '../../../shared/models'

export const withdrawalsRepo = {
  list(): Withdrawal[] {
    return getDb()
      .prepare('SELECT * FROM withdrawals ORDER BY date DESC, id DESC')
      .all() as Withdrawal[]
  },

  total(): number {
    const row = getDb()
      .prepare('SELECT COALESCE(SUM(amount), 0) AS t FROM withdrawals')
      .get() as { t: number }
    return roundMoney(row.t)
  },

  create(input: CreateWithdrawalInput): Withdrawal {
    const db = getDb()
    const now = new Date().toISOString()
    const info = db
      .prepare(
        'INSERT INTO withdrawals (amount, date, note, created_at) VALUES (@amount, @date, @note, @created_at)',
      )
      .run({
        amount: input.amount,
        date: input.date,
        note: input.note ?? null,
        created_at: now,
      })
    return db
      .prepare('SELECT * FROM withdrawals WHERE id = ?')
      .get(Number(info.lastInsertRowid)) as Withdrawal
  },

  /** Insert a full record (used by JSON import / restore). */
  insertFull(w: Withdrawal): void {
    getDb()
      .prepare(
        'INSERT INTO withdrawals (id, amount, date, note, created_at) VALUES (@id, @amount, @date, @note, @created_at)',
      )
      .run({ id: w.id, amount: w.amount, date: w.date, note: w.note ?? null, created_at: w.created_at })
  },

  remove(id: number): boolean {
    return getDb().prepare('DELETE FROM withdrawals WHERE id = ?').run(id).changes > 0
  },

  clearAll(): void {
    getDb().exec('DELETE FROM withdrawals;')
  },
}
