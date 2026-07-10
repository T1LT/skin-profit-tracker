import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { initDatabase, closeDatabase } from './db/database'
import { registerIpcHandlers } from './ipc'
import { runAutoBackupIfDue } from './services/backup'

const APP_ID = 'com.skinprofittracker.app'

// vite-plugin-electron injects this in dev; it is undefined in production.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function resolvePreload(): string {
  // Depending on the build format the preload lands as either .js (CJS) or .mjs.
  const js = path.join(__dirname, 'preload.js')
  const mjs = path.join(__dirname, 'preload.mjs')
  return fs.existsSync(js) ? js : mjs
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    frame: false, // custom titlebar (see src/components/layout/TitleBar.tsx)
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0c12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Keep the renderer's maximize button icon in sync with the real window state.
  const emitMaximized = (value: boolean) =>
    mainWindow?.webContents.send('window:maximized', value)
  mainWindow.on('maximize', () => emitMaximized(true))
  mainWindow.on('unmaximize', () => emitMaximized(false))

  // Security: never navigate away from the app; open external links in the OS browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) return
    event.preventDefault()
  })

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/** In production, lock the renderer down with a strict Content-Security-Policy. */
function applyContentSecurityPolicy(): void {
  if (DEV_SERVER_URL) return // dev server needs a looser policy for HMR
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'",
        ],
      },
    })
  })
}

/**
 * A minimal, hidden application menu. The window is frameless so the bar is never
 * shown, but the roles keep clipboard shortcuts (copy/paste/undo) working inside
 * inputs, plus dev tools in development.
 */
function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function bootstrap(): void {
  try {
    const dbPath = path.join(app.getPath('userData'), 'skin-profit-tracker.db')
    initDatabase(dbPath)
  } catch (err) {
    dialog.showErrorBox(
      'Database error',
      `Skin Profit Tracker could not open its database.\n\n${String(err)}`,
    )
    app.quit()
    return
  }

  registerIpcHandlers(() => mainWindow)
  runAutoBackupIfDue() // daily snapshot, keeps the latest 30
  applyContentSecurityPolicy()
  buildMenu()
  createWindow()
}

// Single-instance lock — a portfolio app should never run twice against one DB.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)
    bootstrap()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDatabase()
})
