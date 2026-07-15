import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  BackupInfo,
  CreateSkinInput,
  CreateWithdrawalInput,
  CsvKind,
  DashboardStats,
  FileResult,
  ImportResult,
  ListSkinInput,
  PagedResult,
  SellSkinInput,
  Skin,
  SkinFilter,
  Statistics,
  UpdateSkinInput,
  Withdrawal,
} from '../shared/models'

/**
 * The ENTIRE surface the renderer can touch. contextIsolation is on and
 * nodeIntegration is off, so this typed bridge is the only path to the database.
 */
const api = {
  skins: {
    list: (filter: SkinFilter = {}): Promise<PagedResult<Skin>> =>
      ipcRenderer.invoke('skins:list', filter),
    get: (id: number): Promise<Skin | null> => ipcRenderer.invoke('skins:get', id),
    all: (): Promise<Skin[]> => ipcRenderer.invoke('skins:all'),
    create: (input: CreateSkinInput): Promise<Skin> => ipcRenderer.invoke('skins:create', input),
    update: (id: number, patch: UpdateSkinInput): Promise<Skin | null> =>
      ipcRenderer.invoke('skins:update', id, patch),
    listForSale: (id: number, input: ListSkinInput): Promise<Skin | null> =>
      ipcRenderer.invoke('skins:listForSale', id, input),
    unlist: (id: number): Promise<Skin | null> => ipcRenderer.invoke('skins:unlist', id),
    sell: (id: number, input: SellSkinInput): Promise<Skin | null> =>
      ipcRenderer.invoke('skins:sell', id, input),
    reopen: (id: number): Promise<Skin | null> => ipcRenderer.invoke('skins:reopen', id),
    duplicate: (id: number): Promise<Skin | null> => ipcRenderer.invoke('skins:duplicate', id),
    remove: (id: number): Promise<boolean> => ipcRenderer.invoke('skins:remove', id),
    bulkRemove: (ids: number[]): Promise<number> => ipcRenderer.invoke('skins:bulkRemove', ids),
    restore: (skin: Skin): Promise<Skin> => ipcRenderer.invoke('skins:restore', skin),
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', patch),
  },
  dashboard: {
    stats: (): Promise<DashboardStats> => ipcRenderer.invoke('dashboard:stats'),
  },
  statistics: {
    get: (): Promise<Statistics> => ipcRenderer.invoke('statistics:get'),
  },
  withdrawals: {
    list: (): Promise<Withdrawal[]> => ipcRenderer.invoke('withdrawals:list'),
    total: (): Promise<number> => ipcRenderer.invoke('withdrawals:total'),
    create: (input: CreateWithdrawalInput): Promise<Withdrawal> =>
      ipcRenderer.invoke('withdrawals:create', input),
    remove: (id: number): Promise<boolean> => ipcRenderer.invoke('withdrawals:remove', id),
  },
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke('backup:create'),
    list: (): Promise<BackupInfo[]> => ipcRenderer.invoke('backup:list'),
    restore: (backupPath: string): Promise<number> => ipcRenderer.invoke('backup:restore', backupPath),
    chooseFolder: (): Promise<string | null> => ipcRenderer.invoke('backup:chooseFolder'),
    openFolder: (): Promise<void> => ipcRenderer.invoke('backup:openFolder'),
  },
  data: {
    exportJson: (): Promise<FileResult> => ipcRenderer.invoke('data:exportJson'),
    importJson: (): Promise<ImportResult> => ipcRenderer.invoke('data:importJson'),
    exportCsv: (kind: CsvKind): Promise<FileResult> => ipcRenderer.invoke('data:exportCsv', kind),
    reset: (): Promise<void> => ipcRenderer.invoke('data:reset'),
  },
  dev: {
    seed: (force = false): Promise<number> => ipcRenderer.invoke('dev:seed', force),
    clear: (): Promise<void> => ipcRenderer.invoke('dev:clear'),
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    notify: (title: string, body: string): Promise<void> =>
      ipcRenderer.invoke('app:notify', title, body),
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_e: unknown, value: boolean) => cb(value)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    },
  },
}

export type SkinProfitAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
