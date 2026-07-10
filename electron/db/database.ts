import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_SETTINGS } from '../../shared/constants'

export type DB = InstanceType<typeof Database>

let db: DB | null = null

/** The DDL that defines the entire schema. Run on every launch (idempotent). */
const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS skins (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  skin_name              TEXT    NOT NULL,
  weapon                 TEXT    NOT NULL,
  finish                 TEXT    NOT NULL DEFAULT '',
  wear                   TEXT,
  float_value            REAL,
  pattern                INTEGER,
  stattrak               INTEGER NOT NULL DEFAULT 0,
  souvenir               INTEGER NOT NULL DEFAULT 0,

  purchase_source        TEXT    NOT NULL DEFAULT 'Manual',
  purchase_price_usd     REAL,
  purchase_price_inr     REAL,
  purchase_price_empire  REAL,
  purchase_exchange_rate REAL,
  purchase_date          TEXT    NOT NULL,

  sale_source            TEXT,
  sale_price_usd         REAL,
  sale_price_inr         REAL,
  sale_price_empire      REAL,
  sale_exchange_rate     REAL,
  sale_fee_percentage    REAL,
  sale_date              TEXT,

  status                 TEXT    NOT NULL DEFAULT 'owned',
  notes                  TEXT,

  favorite               INTEGER NOT NULL DEFAULT 0,
  pinned                 INTEGER NOT NULL DEFAULT 0,
  wishlist               INTEGER NOT NULL DEFAULT 0,
  tags                   TEXT    NOT NULL DEFAULT '[]',
  category               TEXT,

  created_at             TEXT    NOT NULL,
  updated_at             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  exchange_rate          REAL    NOT NULL,
  empire_coin_inr        REAL    NOT NULL DEFAULT 63,
  default_fee_percentage REAL    NOT NULL,
  theme                  TEXT    NOT NULL,
  currency_symbol        TEXT    NOT NULL,
  backup_location        TEXT,
  auto_backup            INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS market_history (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  skin_id  INTEGER NOT NULL,
  market   TEXT    NOT NULL,
  price    REAL    NOT NULL,
  date     TEXT    NOT NULL,
  FOREIGN KEY (skin_id) REFERENCES skins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  amount     REAL    NOT NULL,
  date       TEXT    NOT NULL,
  note       TEXT,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skins_status          ON skins(status);
CREATE INDEX IF NOT EXISTS idx_skins_purchase_date   ON skins(purchase_date);
CREATE INDEX IF NOT EXISTS idx_skins_sale_date       ON skins(sale_date);
CREATE INDEX IF NOT EXISTS idx_skins_purchase_source ON skins(purchase_source);
CREATE INDEX IF NOT EXISTS idx_skins_sale_source     ON skins(sale_source);
CREATE INDEX IF NOT EXISTS idx_skins_weapon          ON skins(weapon);
CREATE INDEX IF NOT EXISTS idx_market_history_skin   ON market_history(skin_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_date       ON withdrawals(date);
`

const SCHEMA_VERSION = 3

/**
 * Open (creating if needed) the SQLite database at the given path, apply the
 * schema, run migrations and make sure the singleton settings row exists.
 */
export function initDatabase(dbPath: string): DB {
  if (db) return db

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const instance = new Database(dbPath)
  instance.pragma('journal_mode = WAL') // better concurrency + durability
  instance.pragma('synchronous = NORMAL')
  instance.pragma('foreign_keys = ON')

  instance.exec(SCHEMA)
  runMigrations(instance)
  ensureSettingsRow(instance)

  db = instance
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function ensureSettingsRow(instance: DB): void {
  const existing = instance.prepare('SELECT id FROM settings WHERE id = 1').get()
  if (!existing) {
    instance
      .prepare(
        `INSERT INTO settings
           (id, exchange_rate, empire_coin_inr, default_fee_percentage, theme, currency_symbol, backup_location, auto_backup)
         VALUES (1, @exchange_rate, @empire_coin_inr, @default_fee_percentage, @theme, @currency_symbol, @backup_location, @auto_backup)`,
      )
      .run({
        exchange_rate: DEFAULT_SETTINGS.exchange_rate,
        empire_coin_inr: DEFAULT_SETTINGS.empire_coin_inr,
        default_fee_percentage: DEFAULT_SETTINGS.default_fee_percentage,
        theme: DEFAULT_SETTINGS.theme,
        currency_symbol: DEFAULT_SETTINGS.currency_symbol,
        backup_location: DEFAULT_SETTINGS.backup_location,
        auto_backup: DEFAULT_SETTINGS.auto_backup ? 1 : 0,
      })
  }
}

/**
 * Minimal forward-only migration runner. New schema changes append a numbered
 * block here; the schema_version key records how far we've come.
 */
/** Add a column to an existing table if it isn't already present (idempotent). */
function ensureColumn(instance: DB, table: string, column: string, ddl: string): void {
  const cols = instance.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    instance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
  }
}

function runMigrations(instance: DB): void {
  const row = instance.prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined
  const current = row ? Number(row.value) : 0

  // v3: direct CSGOEmpire coin → INR rate (older databases pre-date this column).
  ensureColumn(instance, 'settings', 'empire_coin_inr', 'REAL NOT NULL DEFAULT 63')

  if (current !== SCHEMA_VERSION) {
    instance
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES ('schema_version', @v)
         ON CONFLICT(key) DO UPDATE SET value = @v`,
      )
      .run({ v: String(SCHEMA_VERSION) })
  }
}
