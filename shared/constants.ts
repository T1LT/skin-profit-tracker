import { DEFAULT_EMPIRE_COIN_INR } from './calculations'
import type { AppSettings } from './models'

export const APP_NAME = 'Skin Profit Tracker'
export const APP_VERSION = '1.0.0'

/** Written to the settings table on first launch. */
export const DEFAULT_SETTINGS: AppSettings = {
  exchange_rate: 83.5, // USD -> INR
  empire_coin_inr: DEFAULT_EMPIRE_COIN_INR, // 1 CSGOEmpire coin -> INR
  default_currency: 'EMPIRE', // pre-selected in the purchase / list / sell forms
  default_fee_percentage: 2, // CSFloat default
  theme: 'midnight',
  currency_symbol: '₹',
  backup_location: null,
  auto_backup: true,
}

/** Typical marketplace fee presets (%), used to pre-fill the list + sale forms. */
export const MARKETPLACE_FEES: Record<string, number> = {
  CSFloat: 2,
  Empire: 0,
  Skinport: 12,
  BUFF: 2.5,
  Steam: 15,
  Other: 0,
}

export const MAX_BACKUPS = 30
