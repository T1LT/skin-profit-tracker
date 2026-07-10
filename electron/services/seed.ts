import { skinsRepo } from '../db/repositories/skins'
import { settingsRepo } from '../db/repositories/settings'
import { DEFAULT_EMPIRE_COIN_INR } from '../../shared/calculations'
import { MARKETPLACE_FEES } from '../../shared/constants'
import type { ItemCategory, PurchaseSource, SaleSource, Wear } from '../../shared/models'

interface Template {
  weapon: string
  finish: string
  wear: Wear
  usd: number
  category: ItemCategory
  stattrak?: boolean
  souvenir?: boolean
}

const TEMPLATES: Template[] = [
  { weapon: 'AK-47', finish: 'Redline', wear: 'Field-Tested', usd: 13, category: 'Rifle' },
  { weapon: 'AK-47', finish: 'Asiimov', wear: 'Field-Tested', usd: 46, category: 'Rifle' },
  { weapon: 'AK-47', finish: 'Fire Serpent', wear: 'Field-Tested', usd: 640, category: 'Rifle' },
  { weapon: 'AK-47', finish: 'Vulcan', wear: 'Minimal Wear', usd: 92, category: 'Rifle', stattrak: true },
  { weapon: 'AK-47', finish: 'Neon Rider', wear: 'Factory New', usd: 58, category: 'Rifle' },
  { weapon: 'AWP', finish: 'Asiimov', wear: 'Field-Tested', usd: 98, category: 'Rifle' },
  { weapon: 'AWP', finish: 'Neo-Noir', wear: 'Minimal Wear', usd: 40, category: 'Rifle' },
  { weapon: 'AWP', finish: 'Wildfire', wear: 'Factory New', usd: 78, category: 'Rifle' },
  { weapon: 'AWP', finish: 'Chromatic Aberration', wear: 'Factory New', usd: 22, category: 'Rifle' },
  { weapon: 'M4A4', finish: 'Howl', wear: 'Field-Tested', usd: 1450, category: 'Rifle' },
  { weapon: 'M4A1-S', finish: 'Hyper Beast', wear: 'Field-Tested', usd: 26, category: 'Rifle' },
  { weapon: 'M4A1-S', finish: 'Printstream', wear: 'Minimal Wear', usd: 135, category: 'Rifle' },
  { weapon: 'Desert Eagle', finish: 'Blaze', wear: 'Factory New', usd: 520, category: 'Pistol' },
  { weapon: 'Desert Eagle', finish: 'Printstream', wear: 'Factory New', usd: 88, category: 'Pistol' },
  { weapon: 'USP-S', finish: 'Kill Confirmed', wear: 'Minimal Wear', usd: 96, category: 'Pistol' },
  { weapon: 'Glock-18', finish: 'Fade', wear: 'Factory New', usd: 720, category: 'Pistol' },
  { weapon: 'Glock-18', finish: 'Water Elemental', wear: 'Factory New', usd: 14, category: 'Pistol' },
  { weapon: 'P250', finish: 'Asiimov', wear: 'Field-Tested', usd: 6, category: 'Pistol' },
  { weapon: '★ Karambit', finish: 'Doppler Phase 2', wear: 'Factory New', usd: 660, category: 'Knife' },
  { weapon: '★ Butterfly Knife', finish: 'Fade', wear: 'Factory New', usd: 1620, category: 'Knife' },
  { weapon: '★ Bayonet', finish: 'Tiger Tooth', wear: 'Factory New', usd: 410, category: 'Knife' },
  { weapon: '★ Gut Knife', finish: 'Doppler Phase 4', wear: 'Factory New', usd: 128, category: 'Knife' },
  { weapon: '★ Specialist Gloves', finish: 'Fade', wear: 'Field-Tested', usd: 1880, category: 'Gloves' },
  { weapon: '★ Sport Gloves', finish: "Pandora's Box", wear: 'Field-Tested', usd: 2150, category: 'Gloves' },
  { weapon: '★ Driver Gloves', finish: 'King Snake', wear: 'Field-Tested', usd: 340, category: 'Gloves' },
  { weapon: 'AK-47', finish: 'Bloodsport', wear: 'Factory New', usd: 62, category: 'Rifle', stattrak: true },
  { weapon: 'AWP', finish: 'Dragon Lore', wear: 'Field-Tested', usd: 8200, category: 'Rifle', souvenir: true },
  { weapon: 'Five-SeveN', finish: 'Case Hardened', wear: 'Field-Tested', usd: 9, category: 'Pistol' },
  { weapon: 'Galil AR', finish: 'Chatterbox', wear: 'Field-Tested', usd: 21, category: 'Rifle' },
  { weapon: 'MAC-10', finish: 'Neon Rider', wear: 'Factory New', usd: 12, category: 'SMG' },
]

const PURCHASE_SOURCES: PurchaseSource[] = ['CSFloat', 'CSGOEmpire', 'Skinport', 'BUFF', 'Steam']
const SALE_SOURCES: SaleSource[] = ['CSFloat', 'Empire', 'Skinport', 'BUFF', 'Steam']

const FLOAT_RANGES: Record<Wear, [number, number]> = {
  'Factory New': [0.0, 0.069],
  'Minimal Wear': [0.07, 0.149],
  'Field-Tested': [0.15, 0.379],
  'Well-Worn': [0.38, 0.449],
  'Battle-Scarred': [0.45, 0.999],
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function floatFor(wear: Wear): number {
  const [lo, hi] = FLOAT_RANGES[wear]
  return Number(rand(lo, hi).toFixed(6))
}

function makeName(t: Template): string {
  const st = t.stattrak ? 'StatTrak™ ' : ''
  const sv = t.souvenir ? 'Souvenir ' : ''
  return `${sv}${st}${t.weapon} | ${t.finish} (${t.wear})`
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/**
 * Populate the database with a realistic spread of trades so the app can be
 * explored immediately. No-op if the user already has data (unless forced).
 * Returns the number of records inserted.
 */
export function seedSampleData(force = false): number {
  if (!force && skinsRepo.count() > 0) return 0

  const baseRate = settingsRepo.get().exchange_rate || 83.5
  let inserted = 0

  for (const t of TEMPLATES) {
    const purchaseDaysAgo = Math.floor(rand(20, 300))
    const purchaseRate = Number((baseRate * rand(0.97, 1.02)).toFixed(2))
    const purchaseUsd = Number((t.usd * rand(0.9, 1.05)).toFixed(2))
    const source = pick(PURCHASE_SOURCES)

    const created = skinsRepo.create({
      skin_name: makeName(t),
      weapon: t.weapon,
      finish: t.finish,
      wear: t.wear,
      float_value: floatFor(t.wear),
      pattern: t.category === 'Knife' || t.category === 'Gloves' ? Math.floor(rand(1, 1000)) : null,
      stattrak: !!t.stattrak,
      souvenir: !!t.souvenir,
      category: t.category,
      purchase_source: source,
      purchase_price_usd: purchaseUsd,
      purchase_price_empire:
        source === 'CSGOEmpire'
          ? Number(((purchaseUsd * purchaseRate) / DEFAULT_EMPIRE_COIN_INR).toFixed(2))
          : null,
      purchase_exchange_rate: purchaseRate,
      purchase_date: isoDaysAgo(purchaseDaysAgo),
      favorite: Math.random() < 0.15,
      tags: t.category === 'Knife' || t.category === 'Gloves' ? ['high-tier'] : [],
    })
    inserted++

    // ~62% of the inventory has been sold; the rest is still held.
    if (Math.random() < 0.62) {
      const holdingDays = Math.floor(rand(4, Math.min(purchaseDaysAgo - 1, 70)))
      const saleDaysAgo = Math.max(0, purchaseDaysAgo - holdingDays)
      const saleSource = pick(SALE_SOURCES)
      // Outcome multiplier: mostly small wins, some big wins, a few losses.
      const roll = Math.random()
      const multiplier = roll < 0.25 ? rand(0.78, 0.98) : roll < 0.85 ? rand(1.03, 1.35) : rand(1.4, 1.9)
      const saleRate = Number((baseRate * rand(0.98, 1.03)).toFixed(2))
      const saleUsd = Number((purchaseUsd * multiplier).toFixed(2))

      skinsRepo.sell(created.id, {
        sale_source: saleSource,
        sale_price_usd: saleUsd,
        sale_price_empire:
          saleSource === 'Empire'
            ? Number(((saleUsd * saleRate) / DEFAULT_EMPIRE_COIN_INR).toFixed(2))
            : null,
        sale_exchange_rate: saleRate,
        sale_fee_percentage: MARKETPLACE_FEES[saleSource] ?? 2,
        sale_date: isoDaysAgo(saleDaysAgo),
      })
    }
  }

  return inserted
}
