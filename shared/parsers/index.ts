/**
 * Listing parsers for CSFloat and CSGOEmpire. Pure functions — given pasted text
 * they extract weapon, finish, wear, float, pattern, StatTrak/Souvenir and price.
 * Everything is best-effort and always returns a result the user can then edit;
 * `warnings` flags anything that couldn't be confidently detected.
 */
import { WEAR_VALUES, type ItemCategory, type Wear } from '../models'

export type ListingSource = 'CSFloat' | 'CSGOEmpire'

export interface ParsedListing {
  source: ListingSource
  weapon: string
  finish: string
  wear: Wear | null
  float_value: number | null
  pattern: number | null
  stattrak: boolean
  souvenir: boolean
  category: ItemCategory | null
  price_usd: number | null
  price_empire: number | null
  warnings: string[]
}

/* ---------------------------- shared helpers ---------------------------- */

const WEAR_BY_CODE: Record<string, Wear> = {
  FN: 'Factory New',
  MW: 'Minimal Wear',
  FT: 'Field-Tested',
  WW: 'Well-Worn',
  BS: 'Battle-Scarred',
}
const WEAR_BY_NAME = new Map<string, Wear>(WEAR_VALUES.map((w) => [w.toLowerCase(), w]))

export function parseWear(input: string | null | undefined): Wear | null {
  if (!input) return null
  const trimmed = input.trim()
  const byName = WEAR_BY_NAME.get(trimmed.toLowerCase())
  if (byName) return byName
  const code = trimmed.toUpperCase().replace(/[^A-Z]/g, '')
  return WEAR_BY_CODE[code] ?? null
}

const CATEGORY_MAP: Record<string, ItemCategory> = {
  'AK-47': 'Rifle',
  'M4A4': 'Rifle',
  'M4A1-S': 'Rifle',
  AWP: 'Rifle',
  'Galil AR': 'Rifle',
  FAMAS: 'Rifle',
  'SG 553': 'Rifle',
  AUG: 'Rifle',
  'SSG 08': 'Rifle',
  'SCAR-20': 'Rifle',
  G3SG1: 'Rifle',
  'Glock-18': 'Pistol',
  'USP-S': 'Pistol',
  P2000: 'Pistol',
  P250: 'Pistol',
  'Five-SeveN': 'Pistol',
  'Tec-9': 'Pistol',
  'CZ75-Auto': 'Pistol',
  'Desert Eagle': 'Pistol',
  'R8 Revolver': 'Pistol',
  'Dual Berettas': 'Pistol',
  MP9: 'SMG',
  'MAC-10': 'SMG',
  MP7: 'SMG',
  'MP5-SD': 'SMG',
  'UMP-45': 'SMG',
  P90: 'SMG',
  'PP-Bizon': 'SMG',
  Nova: 'Heavy',
  XM1014: 'Heavy',
  'Sawed-Off': 'Heavy',
  'MAG-7': 'Heavy',
  M249: 'Heavy',
  Negev: 'Heavy',
}

export function weaponCategory(weapon: string): ItemCategory | null {
  const bare = weapon.replace(/★/g, '').trim()
  if (/gloves|hand wraps/i.test(bare)) return 'Gloves'
  if (weapon.includes('★')) return 'Knife'
  const hit = Object.entries(CATEGORY_MAP).find(([name]) => name.toLowerCase() === bare.toLowerCase())
  return hit ? hit[1] : 'Other'
}

/** Detect and strip StatTrak™ / Souvenir / ★ prefixes from an item name. */
function extractPrefixes(raw: string): {
  name: string
  star: boolean
  stattrak: boolean
  souvenir: boolean
} {
  let s = raw.trim()
  let star = false
  let stattrak = false
  let souvenir = false

  if (/★/.test(s)) {
    star = true
    s = s.replace(/★/g, '').trim()
  }
  if (/stat\s?trak™?/i.test(s)) {
    stattrak = true
    s = s.replace(/stat\s?trak™?/i, '').trim()
  }
  if (/\bsouvenir\b/i.test(s)) {
    souvenir = true
    s = s.replace(/\bsouvenir\b/i, '').trim()
  }
  return { name: s.trim(), star, stattrak, souvenir }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function toNumber(line: string): number | null {
  const m = line.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

function priceAfterLabel(lines: string[]): number | null {
  const idx = lines.findIndex((l) => /^price\b/i.test(l))
  if (idx < 0) return null
  const inline = toNumber(lines[idx].replace(/^price/i, ''))
  if (inline != null) return inline
  for (let i = idx + 1; i < lines.length; i++) {
    const n = toNumber(lines[i])
    if (n != null) return n
  }
  return null
}

function extractFloat(text: string): number | null {
  const labeled = text.match(/float[^0-9]*([01]?\.\d{2,})/i)
  if (labeled) return clamp01(parseFloat(labeled[1]))
  const tilde = text.match(/~\s*([01]?\.\d+)/)
  if (tilde) return clamp01(parseFloat(tilde[1]))
  const standalone = text.match(/(?:^|\s)(0?\.\d{4,})(?:\s|$)/)
  if (standalone) {
    const v = parseFloat(standalone[1])
    if (v < 1) return clamp01(v)
  }
  return null
}

function extractPattern(text: string): number | null {
  const m = text.match(/(?:paint\s*seed|pattern|seed)[^0-9]*(\d{1,4})/i)
  return m ? parseInt(m[1], 10) : null
}

/** Split a "Weapon | Finish (Wear)" style core name. */
function splitNameAndWear(core: string): { weapon: string; finish: string; wear: Wear | null } {
  let rest = core.trim()
  let wear: Wear | null = null
  const wearMatch = rest.match(/\(([^)]+)\)\s*$/)
  if (wearMatch) {
    const parsed = parseWear(wearMatch[1])
    if (parsed) {
      wear = parsed
      rest = rest.replace(/\s*\([^)]+\)\s*$/, '').trim()
    }
  }
  const pipe = rest.indexOf('|')
  if (pipe >= 0) {
    return { weapon: rest.slice(0, pipe).trim(), finish: rest.slice(pipe + 1).trim(), wear }
  }
  return { weapon: rest, finish: '', wear }
}

/* ------------------------------ CSFloat ------------------------------ */

export function parseCsfloat(text: string): ParsedListing {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const warnings: string[] = []

  const nameLine =
    lines.find((l) => /\|/.test(l)) ?? lines.find((l) => /★/.test(l)) ?? lines[0] ?? ''

  const { name, star, stattrak, souvenir } = extractPrefixes(nameLine)
  const { weapon: rawWeapon, finish, wear } = splitNameAndWear(name)
  const weapon = star && !rawWeapon.startsWith('★') ? `★ ${rawWeapon}` : rawWeapon

  const floatVal = extractFloat(text)

  // Price (USD): a $-amount wins, then a labelled price, then the largest number.
  let priceUsd: number | null = null
  const dollar = text.match(/\$\s*([\d,]+(?:\.\d+)?)/)
  if (dollar) priceUsd = parseFloat(dollar[1].replace(/,/g, ''))
  if (priceUsd == null) priceUsd = priceAfterLabel(lines)
  if (priceUsd == null) {
    const nums = lines
      .map(toNumber)
      .filter((n): n is number => n != null && n !== floatVal && n >= 0.5)
    if (nums.length) priceUsd = Math.max(...nums)
  }

  if (!weapon) warnings.push('Could not detect the weapon — please fill it in.')
  if (priceUsd == null) warnings.push('Could not detect a price — please enter it manually.')
  if (!wear) warnings.push('No wear detected.')

  return {
    source: 'CSFloat',
    weapon,
    finish,
    wear,
    float_value: floatVal,
    pattern: extractPattern(text),
    stattrak,
    souvenir,
    category: weapon ? weaponCategory(weapon) : null,
    price_usd: priceUsd,
    price_empire: null,
    warnings,
  }
}

/* ---------------------------- CSGOEmpire ---------------------------- */

export function parseCsgoempire(text: string): ParsedListing {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const warnings: string[] = []

  const bracketRe = /\[(FN|MW|FT|WW|BS|ST|SV|ST™)\]/gi
  let weaponIdx = lines.findIndex((l) => /\[(FN|MW|FT|WW|BS)\]/i.test(l))
  if (weaponIdx < 0) weaponIdx = lines.findIndex((l) => /★/.test(l))
  if (weaponIdx < 0) weaponIdx = 0

  let weaponLine = lines[weaponIdx] ?? ''
  let wear: Wear | null = null
  let bracketStat = false
  let bracketSouv = false

  const brackets = weaponLine.match(bracketRe) ?? []
  for (const b of brackets) {
    const code = b.replace(/[[\]]/g, '').toUpperCase()
    if (WEAR_BY_CODE[code]) wear = WEAR_BY_CODE[code]
    else if (code.startsWith('ST')) bracketStat = true
    else if (code === 'SV') bracketSouv = true
  }
  weaponLine = weaponLine.replace(bracketRe, '').trim()

  const prefixes = extractPrefixes(weaponLine)

  // The weapon line may itself carry the finish inline ("AWP | Neo-Noir").
  let baseName = prefixes.name
  let finish = ''
  const pipe = baseName.indexOf('|')
  if (pipe >= 0) {
    finish = baseName.slice(pipe + 1).trim()
    baseName = baseName.slice(0, pipe).trim()
  }

  const weapon = prefixes.star ? `★ ${baseName}` : baseName
  const stattrak = bracketStat || prefixes.stattrak
  const souvenir = bracketSouv || prefixes.souvenir

  // Otherwise the finish is the first line after the weapon that is not a
  // price/float/label (the common CSGOEmpire two-line layout).
  if (!finish) {
    for (let i = weaponIdx + 1; i < lines.length; i++) {
      const l = lines[i]
      if (/^price\b/i.test(l)) break
      if (/^~?\s*[01]?\.\d+$/.test(l)) continue // float-only line
      if (/^\$?[\d,]+(?:\.\d+)?$/.test(l)) continue // number-only line
      finish = l.replace(/\s*-\s*/g, ' ').trim() // "Doppler - Phase 4" -> "Doppler Phase 4"
      break
    }
  }

  const floatVal = extractFloat(text)

  // Empire prices are in coins: prefer a labelled price, else the last number
  // that is not the float.
  let priceEmpire = priceAfterLabel(lines)
  if (priceEmpire == null) {
    const nums = lines.map(toNumber).filter((n): n is number => n != null && n !== floatVal && n >= 1)
    if (nums.length) priceEmpire = nums[nums.length - 1]
  }

  if (!weapon) warnings.push('Could not detect the weapon — please fill it in.')
  if (!finish) warnings.push('No finish detected.')
  if (priceEmpire == null) warnings.push('Could not detect the Empire coin price.')
  if (!wear) warnings.push('No wear detected.')

  return {
    source: 'CSGOEmpire',
    weapon,
    finish,
    wear,
    float_value: floatVal,
    pattern: extractPattern(text),
    stattrak,
    souvenir,
    category: weapon ? weaponCategory(weapon) : null,
    price_usd: null,
    price_empire: priceEmpire,
    warnings,
  }
}

/* ---------------------------- dispatch ---------------------------- */

export function detectSource(text: string): ListingSource | null {
  if (!text.trim()) return null
  if (/\[(FN|MW|FT|WW|BS)\]/i.test(text) || /~\s*[01]?\.\d/.test(text)) return 'CSGOEmpire'
  if (
    /\|/.test(text) &&
    /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred|FN|MW|FT|WW|BS)\)/i.test(text)
  ) {
    return 'CSFloat'
  }
  if (/\$\s*\d/.test(text)) return 'CSFloat'
  if (/\|/.test(text)) return 'CSFloat'
  return null
}

export function parseListing(text: string, prefer?: ListingSource): ParsedListing | null {
  const source = prefer ?? detectSource(text)
  if (!source) return null
  return source === 'CSGOEmpire' ? parseCsgoempire(text) : parseCsfloat(text)
}
