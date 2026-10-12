const CREATE_GAS_STATION_TABLE = `CREATE TABLE IF NOT EXISTS GAS_STATION (
  GAS_STATION_ID INTEGER NOT NULL PRIMARY KEY,
  NAME VARCHAR(255) NULL,
  ADRESS VARCHAR(255) NULL,
  CITY VARCHAR(255) NULL
);`;

const CREATE_REFUELLING_TABLE = `CREATE TABLE IF NOT EXISTS REFUELLING (
  Refuelling_id INTEGER PRIMARY KEY AUTOINCREMENT,
  Liters DECIMAL(5,2) NOT NULL,
  Bl_additive INTEGER NULL
    CHECK (Bl_additive IS NULL OR Bl_additive IN (0, 1)),
  Mileage INTEGER NULL,
  Bl_full_tank INTEGER NULL
    CHECK (Bl_full_tank IS NULL OR Bl_full_tank IN (0, 1)),
  Dh_refuelling TEXT NOT NULL DEFAULT (datetime('now')),
  Cd_status INTEGER NOT NULL DEFAULT (1)
    CHECK (Cd_status IN (0, 1)),
  Gas_price DECIMAL(6,3) NULL,
  GAS_STATION_ID INTEGER NULL,
  CONSTRAINT CK_REFUELLING_Liters_NonNegative
    CHECK (Liters >= 0 AND Liters <= 999.99),
  CONSTRAINT CK_REFUELLING_Mileage_NonNegative
    CHECK (Mileage IS NULL OR Mileage >= 0),
  CONSTRAINT CK_REFUELLING_Gas_price_NonNegative
    CHECK (Gas_price IS NULL OR (Gas_price >= 0 AND Gas_price <= 999.999)),
  CONSTRAINT FK_REFUELLING_GAS_STATION
    FOREIGN KEY (GAS_STATION_ID) REFERENCES GAS_STATION (GAS_STATION_ID)
);`;

const CREATE_REFUELLING_MILEAGE_TRIGGER = `CREATE TRIGGER IF NOT EXISTS TR_REFUELLING_MILEAGE_INCREASES
BEFORE INSERT ON REFUELLING
WHEN NEW.Mileage IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM REFUELLING
    WHERE Cd_status = 1 AND Mileage IS NOT NULL
  )
  AND NEW.Mileage <= (
    SELECT Mileage
    FROM REFUELLING
    WHERE Cd_status = 1 AND Mileage IS NOT NULL
    ORDER BY Dh_refuelling DESC, Refuelling_id DESC
    LIMIT 1
  )
BEGIN
  SELECT RAISE(ABORT, 'Mileage must be greater than the previous refuelling.');
END;`;

/**
 * Each entry describes the statements needed to move a database from the
 * previous version to `toVersion`. Add future ALTER/CREATE statements in a
 * new entry rather than changing a migration that may already have shipped.
 */
export const DATABASE_MIGRATIONS = [
  {
    toVersion: 1,
    statements: [
      CREATE_GAS_STATION_TABLE,
      CREATE_REFUELLING_TABLE,
      CREATE_REFUELLING_MILEAGE_TRIGGER,
    ],
  },
];

export const DATABASE_VERSION = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]?.toVersion ?? 0;

/**
 * Registers versioned schema changes with @capacitor-community/sqlite.
 * The plugin applies pending entries when the connection opens at the latest
 * database version.
 *
 * @param {import('@capacitor-community/sqlite').SQLiteConnection} sqlite
 * @param {string} databaseName
 */
export async function registerDatabaseMigrations(sqlite, databaseName) {
  if (!sqlite || typeof sqlite.addUpgradeStatement !== 'function') {
    throw new TypeError('A conexão SQLite precisa oferecer addUpgradeStatement().');
  }

  if (typeof databaseName !== 'string' || databaseName.trim() === '') {
    throw new TypeError('Informe o nome do banco para registrar as migrations.');
  }

  if (DATABASE_MIGRATIONS.length > 0) {
    await sqlite.addUpgradeStatement(databaseName, DATABASE_MIGRATIONS);
  }
}
