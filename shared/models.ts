/**
 * Shared domain models. These types are imported by BOTH the Electron main
 * process (database + services) and the React renderer, so they must not depend
 * on any Node or DOM API.
 *
 * The base reporting currency for the entire app is INR. Every purchase and sale
 * always stores a canonical `*_inr` value, while the original currency values
 * (USD / Empire coins) and the exchange rate used at the time are preserved so
 * that historical numbers are never rewritten when the live exchange rate moves.
 */

export const WEAR_VALUES = [
  'Factory New',
  'Minimal Wear',
  'Field-Tested',
  'Well-Worn',
  'Battle-Scarred',
] as const
export type Wear = (typeof WEAR_VALUES)[number]

export const WEAR_SHORT: Record<Wear, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
}

export const PURCHASE_SOURCES = [
  'CSFloat',
  'CSGOEmpire',
  'Skinport',
  'BUFF',
  'Steam',
  'Manual',
  'Other',
] as const
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number]

export const SALE_SOURCES = ['CSFloat', 'Empire', 'Skinport', 'BUFF', 'Steam', 'Other'] as const
export type SaleSource = (typeof SALE_SOURCES)[number]

export const SKIN_STATUSES = ['owned', 'sold'] as const
export type SkinStatus = (typeof SKIN_STATUSES)[number]

export const CURRENCIES = ['USD', 'INR', 'EMPIRE'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Item category — knife / gloves / weapon skin. Detected by the parsers. */
export const ITEM_CATEGORIES = ['Knife', 'Gloves', 'Rifle', 'Pistol', 'SMG', 'Heavy', 'Other'] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

/** The canonical skin record, exactly mirroring a row in the `skins` table. */
export interface Skin {
  id: number
  skin_name: string
  weapon: string
  finish: string
  wear: Wear | null
  float_value: number | null
  pattern: number | null
  stattrak: boolean
  souvenir: boolean

  purchase_source: PurchaseSource
  purchase_price_usd: number | null
  purchase_price_inr: number | null
  purchase_price_empire: number | null
  purchase_exchange_rate: number | null
  purchase_date: string

  sale_source: SaleSource | null
  sale_price_usd: number | null
  sale_price_inr: number | null
  sale_price_empire: number | null
  sale_exchange_rate: number | null
  sale_fee_percentage: number | null
  sale_date: string | null

  status: SkinStatus
  notes: string | null

  favorite: boolean
  pinned: boolean
  wishlist: boolean
  tags: string[]
  category: ItemCategory | null

  created_at: string
  updated_at: string
}

export interface CreateSkinInput {
  skin_name: string
  weapon: string
  finish: string
  wear?: Wear | null
  float_value?: number | null
  pattern?: number | null
  stattrak?: boolean
  souvenir?: boolean

  purchase_source: PurchaseSource
  purchase_price_usd?: number | null
  purchase_price_inr?: number | null
  purchase_price_empire?: number | null
  purchase_exchange_rate?: number | null
  purchase_date: string

  notes?: string | null
  favorite?: boolean
  pinned?: boolean
  wishlist?: boolean
  tags?: string[]
  category?: ItemCategory | null
}

export type UpdateSkinInput = Partial<Omit<Skin, 'id' | 'created_at' | 'updated_at'>>

export interface SellSkinInput {
  sale_source: SaleSource
  sale_price_usd?: number | null
  sale_price_inr?: number | null
  sale_price_empire?: number | null
  sale_exchange_rate?: number | null
  sale_fee_percentage?: number | null
  sale_date: string
  notes?: string | null
}

export interface SkinFilter {
  search?: string
  status?: SkinStatus | 'all'
  purchaseSource?: PurchaseSource | 'all'
  saleSource?: SaleSource | 'all'
  dateFrom?: string
  dateTo?: string
  priceMin?: number
  priceMax?: number
  favorite?: boolean
  pinned?: boolean
  wishlist?: boolean
  sortBy?: keyof Skin | 'profit'
  sortDir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

export interface AppSettings {
  exchange_rate: number
  /** INR value of a single CSGOEmpire coin (1 coin = N INR). */
  empire_coin_inr: number
  default_fee_percentage: number
  theme: string
  currency_symbol: string
  backup_location: string | null
  auto_backup: boolean
}

export interface MarketHistoryEntry {
  id: number
  skin_id: number
  market: string
  price: number
  date: string
}

/** A cash withdrawal against realized profit (amount in INR). */
export interface Withdrawal {
  id: number
  amount: number
  date: string
  note: string | null
  created_at: string
}

export interface CreateWithdrawalInput {
  amount: number
  date: string
  note?: string | null
}

/* ------------------------------------------------------------------ *
 * Backup / import-export
 * ------------------------------------------------------------------ */

export interface BackupInfo {
  name: string
  path: string
  size: number
  createdAt: string
}

export interface DbSnapshot {
  app: string
  version: string
  exportedAt: string
  skins: Skin[]
  settings: AppSettings
  marketHistory: MarketHistoryEntry[]
  withdrawals?: Withdrawal[]
}

export const CSV_KINDS = ['inventory', 'purchases', 'sales', 'profit', 'statistics'] as const
export type CsvKind = (typeof CSV_KINDS)[number]

/** Result of a save/export dialog action. */
export interface FileResult {
  canceled: boolean
  path?: string
}

/** Result of an import/restore dialog action. */
export interface ImportResult {
  canceled: boolean
  count?: number
}

/* ------------------------------------------------------------------ *
 * Dashboard / analytics payloads (all monetary values are in INR)
 * ------------------------------------------------------------------ */

export interface MonthlyPoint {
  month: string // YYYY-MM
  label: string // e.g. "Jul 26"
  purchases: number
  sales: number
  profit: number
  purchaseCount: number
  saleCount: number
}

export interface TimelinePoint {
  date: string
  cumulativeProfit: number
}

export interface SourceSlice {
  source: string
  value: number
  count: number
}

export interface TopSkin {
  id: number
  name: string
  weapon: string
  finish: string
  wear: Wear | null
  stattrak: boolean
  profit: number
  roi: number
}

export interface RecentSkin {
  id: number
  name: string
  weapon: string
  finish: string
  wear: Wear | null
  stattrak: boolean
  souvenir: boolean
  price: number
  date: string
  source: string
}

export interface TradeExtreme {
  id: number
  name: string
  weapon: string
  finish: string
  profit: number
  roi: number
}

/* ------------------------------------------------------------------ *
 * Statistics page payloads
 * ------------------------------------------------------------------ */

export interface NamedCount {
  name: string
  count: number
}

export interface NamedProfit {
  name: string
  profit: number
}

export interface MarketplaceStat {
  source: string
  trades: number
  profit: number
  net: number
  roi: number
}

export interface WeaponStat {
  weapon: string
  trades: number
  profit: number
  roi: number
}

export interface RoiBucket {
  label: string
  count: number
}

export interface Statistics {
  totalTrades: number
  totalItems: number
  wins: number
  losses: number
  winRate: number
  averageRoi: number
  medianRoi: number
  averageHoldingDays: number
  averageFeesPaid: number
  totalRealizedProfit: number
  totalInvested: number
  mostTradedWeapon: NamedCount | null
  mostProfitableWeapon: NamedProfit | null
  mostProfitableFinish: NamedProfit | null
  bestTrade: TradeExtreme | null
  worstTrade: TradeExtreme | null
  profitByMarketplace: MarketplaceStat[]
  topWeapons: WeaponStat[]
  roiDistribution: RoiBucket[]
}

export interface DashboardStats {
  totalInventoryValue: number
  totalPurchaseCost: number
  totalSoldValue: number
  realizedProfit: number
  totalWithdrawn: number
  availableBalance: number
  unrealizedProfit: number
  overallRoi: number
  ownedCount: number
  soldCount: number
  avgHoldingDays: number
  avgPurchasePrice: number
  avgSalePrice: number
  totalFeesPaid: number
  highestProfit: TradeExtreme | null
  biggestLoss: TradeExtreme | null
  monthly: MonthlyPoint[]
  profitTimeline: TimelinePoint[]
  purchaseSources: SourceSlice[]
  saleSources: SourceSlice[]
  topProfitable: TopSkin[]
  recentPurchases: RecentSkin[]
  recentSales: RecentSkin[]
}
