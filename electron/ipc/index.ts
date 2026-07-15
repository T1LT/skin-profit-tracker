import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron'
import fs from 'node:fs'
import { skinsRepo } from '../db/repositories/skins'
import { settingsRepo } from '../db/repositories/settings'
import { withdrawalsRepo } from '../db/repositories/withdrawals'
import { getDashboardStats } from '../services/dashboard'
import { getStatistics } from '../services/statistics'
import { seedSampleData } from '../services/seed'
import { buildCsv } from '../services/csv'
import {
  createBackup,
  getBackupDir,
  listBackups,
  restoreFromFile,
  writeSnapshot,
} from '../services/backup'
import type {
  AppSettings,
  CreateSkinInput,
  CreateWithdrawalInput,
  CsvKind,
  FileResult,
  ImportResult,
  ListSkinInput,
  SellSkinInput,
  Skin,
  SkinFilter,
  UpdateSkinInput,
} from '../../shared/models'

type Handler = (...args: never[]) => unknown

/** Wrap every handler so a thrown DB error is logged in the main process. */
function handle(channel: string, fn: Handler): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await (fn as (...a: unknown[]) => unknown)(...args)
    } catch (err) {
      console.error(`[ipc] ${channel} failed:`, err)
      throw err instanceof Error ? err : new Error(String(err))
    }
  })
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  /* -------- skins -------- */
  handle('skins:list', (filter: SkinFilter) => skinsRepo.list(filter))
  handle('skins:get', (id: number) => skinsRepo.getById(id))
  handle('skins:all', () => skinsRepo.all())
  handle('skins:create', (input: CreateSkinInput) => skinsRepo.create(input))
  handle('skins:update', (id: number, patch: UpdateSkinInput) => skinsRepo.update(id, patch))
  handle('skins:listForSale', (id: number, input: ListSkinInput) =>
    skinsRepo.listForSale(id, input),
  )
  handle('skins:unlist', (id: number) => skinsRepo.unlist(id))
  handle('skins:sell', (id: number, input: SellSkinInput) => skinsRepo.sell(id, input))
  handle('skins:reopen', (id: number) => skinsRepo.reopen(id))
  handle('skins:duplicate', (id: number) => skinsRepo.duplicate(id))
  handle('skins:remove', (id: number) => skinsRepo.remove(id))
  handle('skins:bulkRemove', (ids: number[]) => skinsRepo.bulkRemove(ids))
  handle('skins:restore', (skin: Skin) => skinsRepo.insertFull(skin, true))

  /* -------- settings -------- */
  handle('settings:get', () => settingsRepo.get())
  handle('settings:update', (patch: Partial<AppSettings>) => settingsRepo.update(patch))

  /* -------- dashboard / statistics -------- */
  handle('dashboard:stats', () => getDashboardStats())
  handle('statistics:get', () => getStatistics())

  /* -------- withdrawals -------- */
  handle('withdrawals:list', () => withdrawalsRepo.list())
  handle('withdrawals:total', () => withdrawalsRepo.total())
  handle('withdrawals:create', (input: CreateWithdrawalInput) => withdrawalsRepo.create(input))
  handle('withdrawals:remove', (id: number) => withdrawalsRepo.remove(id))

  /* -------- dev / sample data -------- */
  handle('dev:seed', (force: boolean) => seedSampleData(!!force))
  handle('dev:clear', () => {
    skinsRepo.clearAll()
  })

  /* -------- backups -------- */
  handle('backup:create', () => createBackup())
  handle('backup:list', () => listBackups())
  handle('backup:restore', (backupPath: string) => restoreFromFile(backupPath))
  handle('backup:openFolder', () => shell.openPath(getBackupDir()))
  handle('backup:chooseFolder', async (): Promise<string | null> => {
    const win = getWindow()
    if (!win) return null
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose a backup folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  /* -------- data import / export -------- */
  const stamp = () => new Date().toISOString().slice(0, 10)

  handle('data:exportJson', async (): Promise<FileResult> => {
    const win = getWindow()
    if (!win) return { canceled: true }
    const res = await dialog.showSaveDialog(win, {
      title: 'Export database',
      defaultPath: `skin-profit-tracker-${stamp()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    writeSnapshot(res.filePath)
    return { canceled: false, path: res.filePath }
  })

  handle('data:importJson', async (): Promise<ImportResult> => {
    const win = getWindow()
    if (!win) return { canceled: true }
    const res = await dialog.showOpenDialog(win, {
      title: 'Import database',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true }
    const count = restoreFromFile(res.filePaths[0])
    return { canceled: false, count }
  })

  handle('data:exportCsv', async (kind: CsvKind): Promise<FileResult> => {
    const win = getWindow()
    if (!win) return { canceled: true }
    const res = await dialog.showSaveDialog(win, {
      title: `Export ${kind}`,
      defaultPath: `skin-${kind}-${stamp()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    // Prepend a BOM so Excel opens UTF-8 correctly.
    fs.writeFileSync(res.filePath, '﻿' + buildCsv(kind), 'utf-8')
    return { canceled: false, path: res.filePath }
  })

  handle('data:reset', () => {
    skinsRepo.clearAll()
    withdrawalsRepo.clearAll()
  })

  /* -------- app / notifications -------- */
  handle('app:getVersion', () => app.getVersion())
  handle('app:notify', (title: string, body: string) => {
    if (Notification.isSupported()) new Notification({ title, body }).show()
  })

  /* -------- window controls (custom frameless titlebar) -------- */
  handle('window:minimize', () => getWindow()?.minimize())
  handle('window:toggleMaximize', () => {
    const w = getWindow()
    if (!w) return false
    if (w.isMaximized()) {
      w.unmaximize()
      return false
    }
    w.maximize()
    return true
  })
  handle('window:close', () => getWindow()?.close())
  handle('window:isMaximized', () => !!getWindow()?.isMaximized())
}
