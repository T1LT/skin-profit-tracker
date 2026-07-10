import { getDb } from '../database'
import type { AppSettings } from '../../../shared/models'

interface SettingsRow {
  exchange_rate: number
  empire_coin_inr: number
  default_fee_percentage: number
  theme: string
  currency_symbol: string
  backup_location: string | null
  auto_backup: number
}

function rowToSettings(row: SettingsRow): AppSettings {
  return {
    exchange_rate: row.exchange_rate,
    empire_coin_inr: row.empire_coin_inr,
    default_fee_percentage: row.default_fee_percentage,
    theme: row.theme,
    currency_symbol: row.currency_symbol,
    backup_location: row.backup_location,
    auto_backup: !!row.auto_backup,
  }
}

export const settingsRepo = {
  get(): AppSettings {
    const row = getDb().prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow
    return rowToSettings(row)
  },

  update(patch: Partial<AppSettings>): AppSettings {
    const db = getDb()
    const current = this.get()
    const next: AppSettings = { ...current, ...patch }
    db.prepare(
      `UPDATE settings SET
         exchange_rate = @exchange_rate,
         empire_coin_inr = @empire_coin_inr,
         default_fee_percentage = @default_fee_percentage,
         theme = @theme,
         currency_symbol = @currency_symbol,
         backup_location = @backup_location,
         auto_backup = @auto_backup
       WHERE id = 1`,
    ).run({
      exchange_rate: next.exchange_rate,
      empire_coin_inr: next.empire_coin_inr,
      default_fee_percentage: next.default_fee_percentage,
      theme: next.theme,
      currency_symbol: next.currency_symbol,
      backup_location: next.backup_location,
      auto_backup: next.auto_backup ? 1 : 0,
    })
    return next
  },
}
