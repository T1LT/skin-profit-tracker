import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_SETTINGS } from '../../shared/constants'

export type DB = InstanceType<typeof Database>

let db: DB | null = null

/**
 * The table DDL. Run on every launch (idempotent).
 *
 * Kept separate from SCHEMA_INDEXES because `CREATE TABLE IF NOT EXISTS` is a no-op
 * against a database an older build created — so on those files a column added here
 * only ever arrives via syncColumns(). An index over such a column must therefore be
 * created *after* migrations, or it would reference a column that does not exist yet
 * and take the whole app down at launch. See initDatabase().
 */
const SCHEMA_TABLES = /* sql */ `
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
  purchase_currency      TEXT,
  purchase_price_usd     REAL,
  purchase_price_inr     REAL,
  purchase_price_empire  REAL,
  purchase_exchange_rate REAL,
  purchase_empire_rate   REAL,
  purchase_date          TEXT    NOT NULL,

  list_source            TEXT,
  list_currency          TEXT,
  list_price_usd         REAL,
  list_price_inr         REAL,
  list_price_empire      REAL,
  list_exchange_rate     REAL,
  list_empire_rate       REAL,
  list_fee_percentage    REAL,
  list_date              TEXT,

  sale_source            TEXT,
  sale_currency          TEXT,
  sale_price_usd         REAL,
  sale_price_inr         REAL,
  sale_price_empire      REAL,
  sale_exchange_rate     REAL,
  sale_empire_rate       REAL,
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
  default_currency       TEXT    NOT NULL DEFAULT 'EMPIRE',
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

`

/** Index DDL. Runs *after* migrations, so it may reference newly added columns. */
const SCHEMA_INDEXES = /* sql */ `
CREATE INDEX IF NOT EXISTS idx_skins_status          ON skins(status);
CREATE INDEX IF NOT EXISTS idx_skins_purchase_date   ON skins(purchase_date);
CREATE INDEX IF NOT EXISTS idx_skins_list_date       ON skins(list_date);
CREATE INDEX IF NOT EXISTS idx_skins_sale_date       ON skins(sale_date);
CREATE INDEX IF NOT EXISTS idx_skins_purchase_source ON skins(purchase_source);
CREATE INDEX IF NOT EXISTS idx_skins_sale_source     ON skins(sale_source);
CREATE INDEX IF NOT EXISTS idx_skins_weapon          ON skins(weapon);
CREATE INDEX IF NOT EXISTS idx_market_history_skin   ON market_history(skin_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_date      ON withdrawals(date);
`

const SCHEMA_VERSION = 5

/**
 * Every column each table must have. `CREATE TABLE IF NOT EXISTS` is a no-op on a
 * database an older build already created, so a column added to SCHEMA later never
 * reaches those files unless it is also listed here and backfilled on launch.
 *
 * DDL here must be ALTER-safe, which is stricter than CREATE: no PRIMARY KEY, no
 * UNIQUE, and NOT NULL requires a DEFAULT. Hence the defaults on columns that SCHEMA
 * declares as plain NOT NULL — legacy rows need some value to adopt.
 */
const EXPECTED_COLUMNS: Record<string, Record<string, string>> = {
  skins: {
    skin_name: `TEXT NOT NULL DEFAULT ''`,
    weapon: `TEXT NOT NULL DEFAULT ''`,
    finish: `TEXT NOT NULL DEFAULT ''`,
    wear: `TEXT`,
    float_value: `REAL`,
    pattern: `INTEGER`,
    stattrak: `INTEGER NOT NULL DEFAULT 0`,
    souvenir: `INTEGER NOT NULL DEFAULT 0`,
    purchase_source: `TEXT NOT NULL DEFAULT 'Manual'`,
    purchase_currency: `TEXT`,
    purchase_price_usd: `REAL`,
    purchase_price_inr: `REAL`,
    purchase_price_empire: `REAL`,
    purchase_exchange_rate: `REAL`,
    purchase_empire_rate: `REAL`,
    purchase_date: `TEXT NOT NULL DEFAULT ''`,
    list_source: `TEXT`,
    list_currency: `TEXT`,
    list_price_usd: `REAL`,
    list_price_inr: `REAL`,
    list_price_empire: `REAL`,
    list_exchange_rate: `REAL`,
    list_empire_rate: `REAL`,
    list_fee_percentage: `REAL`,
    list_date: `TEXT`,
    sale_source: `TEXT`,
    sale_currency: `TEXT`,
    sale_price_usd: `REAL`,
    sale_price_inr: `REAL`,
    sale_price_empire: `REAL`,
    sale_exchange_rate: `REAL`,
    sale_empire_rate: `REAL`,
    sale_fee_percentage: `REAL`,
    sale_date: `TEXT`,
    status: `TEXT NOT NULL DEFAULT 'owned'`,
    notes: `TEXT`,
    favorite: `INTEGER NOT NULL DEFAULT 0`,
    pinned: `INTEGER NOT NULL DEFAULT 0`,
    wishlist: `INTEGER NOT NULL DEFAULT 0`,
    tags: `TEXT NOT NULL DEFAULT '[]'`,
    category: `TEXT`,
    created_at: `TEXT NOT NULL DEFAULT ''`,
    updated_at: `TEXT NOT NULL DEFAULT ''`,
  },
  settings: {
    exchange_rate: `REAL NOT NULL DEFAULT ${DEFAULT_SETTINGS.exchange_rate}`,
    empire_coin_inr: `REAL NOT NULL DEFAULT 63`,
    default_currency: `TEXT NOT NULL DEFAULT '${DEFAULT_SETTINGS.default_currency}'`,
    default_fee_percentage: `REAL NOT NULL DEFAULT ${DEFAULT_SETTINGS.default_fee_percentage}`,
    theme: `TEXT NOT NULL DEFAULT '${DEFAULT_SETTINGS.theme}'`,
    currency_symbol: `TEXT NOT NULL DEFAULT '${DEFAULT_SETTINGS.currency_symbol}'`,
    backup_location: `TEXT`,
    auto_backup: `INTEGER NOT NULL DEFAULT 1`,
  },
  market_history: {
    skin_id: `INTEGER NOT NULL DEFAULT 0`,
    market: `TEXT NOT NULL DEFAULT ''`,
    price: `REAL NOT NULL DEFAULT 0`,
    date: `TEXT NOT NULL DEFAULT ''`,
  },
  withdrawals: {
    amount: `REAL NOT NULL DEFAULT 0`,
    date: `TEXT NOT NULL DEFAULT ''`,
    note: `TEXT`,
    created_at: `TEXT NOT NULL DEFAULT ''`,
  },
}

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

  instance.exec(SCHEMA_TABLES)
  runMigrations(instance) // ALTERs land here, before anything can reference a new column
  instance.exec(SCHEMA_INDEXES)
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
           (id, exchange_rate, empire_coin_inr, default_currency, default_fee_percentage, theme, currency_symbol, backup_location, auto_backup)
         VALUES (1, @exchange_rate, @empire_coin_inr, @default_currency, @default_fee_percentage, @theme, @currency_symbol, @backup_location, @auto_backup)`,
      )
      .run({
        exchange_rate: DEFAULT_SETTINGS.exchange_rate,
        empire_coin_inr: DEFAULT_SETTINGS.empire_coin_inr,
        default_currency: DEFAULT_SETTINGS.default_currency,
        default_fee_percentage: DEFAULT_SETTINGS.default_fee_percentage,
        theme: DEFAULT_SETTINGS.theme,
        currency_symbol: DEFAULT_SETTINGS.currency_symbol,
        backup_location: DEFAULT_SETTINGS.backup_location,
        auto_backup: DEFAULT_SETTINGS.auto_backup ? 1 : 0,
      })
  }
}

/**
 * Bring an existing table up to the current shape by adding whatever columns it is
 * missing. Idempotent, so it can run unconditionally on every launch: a database
 * created by the current SCHEMA has nothing to add, and one created by an older
 * build gets the columns that build never knew about.
 */
function syncColumns(instance: DB, table: string, expected: Record<string, string>): string[] {
  const present = new Set(
    (instance.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name),
  )
  const added: string[] = []
  for (const [column, ddl] of Object.entries(expected)) {
    if (!present.has(column)) {
      instance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
      added.push(`${table}.${column}`)
    }
  }
  return added
}

/**
 * Forward-only migration runner. Reconciles every table against EXPECTED_COLUMNS,
 * then records how far we've come.
 */
function runMigrations(instance: DB): void {
  const row = instance.prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined
  const current = row ? Number(row.value) : 0

  const added = Object.entries(EXPECTED_COLUMNS).flatMap(([table, columns]) =>
    syncColumns(instance, table, columns),
  )
  if (added.length > 0) {
    console.log(`[db] migrated ${current} → ${SCHEMA_VERSION}, added: ${added.join(', ')}`)
  }

  if (current !== SCHEMA_VERSION) {
    instance
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES ('schema_version', @v)
         ON CONFLICT(key) DO UPDATE SET value = @v`,
      )
      .run({ v: String(SCHEMA_VERSION) })
  }
}
