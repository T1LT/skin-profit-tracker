import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '../db/database'
import { skinsRepo } from '../db/repositories/skins'
import { settingsRepo } from '../db/repositories/settings'
import { marketHistoryRepo } from '../db/repositories/marketHistory'
import { withdrawalsRepo } from '../db/repositories/withdrawals'
import { APP_NAME, APP_VERSION, MAX_BACKUPS } from '../../shared/constants'
import type { BackupInfo, DbSnapshot, MarketHistoryEntry } from '../../shared/models'

export function getBackupDir(): string {
  const settings = settingsRepo.get()
  const dir = settings.backup_location || path.join(app.getPath('userData'), 'backups')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function allMarketHistory(): MarketHistoryEntry[] {
  return getDb().prepare('SELECT * FROM market_history').all() as MarketHistoryEntry[]
}

/** A complete, serialisable snapshot of the database. */
export function buildSnapshot(): DbSnapshot {
  return {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    skins: skinsRepo.all(),
    settings: settingsRepo.get(),
    marketHistory: allMarketHistory(),
    withdrawals: withdrawalsRepo.list(),
  }
}

export function writeSnapshot(filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(buildSnapshot(), null, 2), 'utf-8')
}

/** Replace all data with the contents of a snapshot. Returns the skin count. */
export function applySnapshot(snapshot: unknown): number {
  const snap = snapshot as Partial<DbSnapshot>
  if (!snap || !Array.isArray(snap.skins)) {
    throw new Error('This file is not a valid Skin Profit Tracker backup.')
  }
  const db = getDb()
  const restore = db.transaction(() => {
    skinsRepo.clearAll() // wipes skins + market_history
    for (const skin of snap.skins as DbSnapshot['skins']) {
      skinsRepo.insertFull(skin, true)
    }
    if (Array.isArray(snap.marketHistory)) {
      for (const m of snap.marketHistory) {
        try {
          marketHistoryRepo.add({ skin_id: m.skin_id, market: m.market, price: m.price, date: m.date })
        } catch {
          /* skip history rows whose skin is missing */
        }
      }
    }
    withdrawalsRepo.clearAll()
    if (Array.isArray(snap.withdrawals)) {
      for (const w of snap.withdrawals) {
        try {
          withdrawalsRepo.insertFull(w)
        } catch {
          /* skip malformed rows */
        }
      }
    }
    if (snap.settings) settingsRepo.update(snap.settings)
  })
  restore()
  return snap.skins.length
}

export function listBackups(): BackupInfo[] {
  const dir = getBackupDir()
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((name) => {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      return { name, path: full, size: stat.size, createdAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function pruneBackups(keep = MAX_BACKUPS): void {
  const backups = listBackups() // newest first
  for (const old of backups.slice(keep)) {
    try {
      fs.rmSync(old.path, { force: true })
    } catch {
      /* ignore */
    }
  }
}

export function createBackup(): string {
  const dir = getBackupDir()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(dir, `backup-${stamp}.json`)
  writeSnapshot(filePath)
  pruneBackups()
  return filePath
}

export function restoreFromFile(filePath: string): number {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return applySnapshot(JSON.parse(raw))
}

/**
 * Run once at startup: if auto-backup is enabled, there is data, and no backup
 * has been made today, create one (then prune to the latest 30).
 */
export function runAutoBackupIfDue(): void {
  try {
    const settings = settingsRepo.get()
    if (!settings.auto_backup || skinsRepo.count() === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const hasToday = listBackups().some((b) => b.createdAt.slice(0, 10) === today)
    if (!hasToday) createBackup()
  } catch (err) {
    console.error('[backup] auto-backup failed:', err)
  }
}
