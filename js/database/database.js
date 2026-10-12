import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { DATABASE_VERSION, registerDatabaseMigrations } from './migrations.js';

const DATABASE_NAME = 'controlador-da-moto';
const DATABASE_MODE = 'no-encryption';
const READ_ONLY = false;

const sqlite = new SQLiteConnection(CapacitorSQLite);
let databasePromise = null;

async function initializeWebSqlite() {
  if (Capacitor.getPlatform() !== 'web') {
    return;
  }

  const { applyPolyfills, defineCustomElements } = await import('jeep-sqlite/loader');
  await applyPolyfills();
  defineCustomElements(window);

  let webSqliteElement = document.querySelector('jeep-sqlite');
  if (!webSqliteElement) {
    webSqliteElement = document.createElement('jeep-sqlite');
    document.body.appendChild(webSqliteElement);
  }

  webSqliteElement.setAttribute('autoSave', 'true');
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

function assertSqliteSucceeded(result, operation) {
  const changes = result?.changes?.changes;
  const message = result?.message ?? result?.error;

  if (message || changes === -1 || !Number.isFinite(changes)) {
    throw new Error(message || `O SQLite não conseguiu ${operation}.`);
  }
}

async function createOrRetrieveConnection() {
  const consistency = await sqlite.checkConnectionsConsistency();
  const existingConnection = await sqlite.isConnection(DATABASE_NAME, READ_ONLY);

  if (consistency.result && existingConnection.result) {
    return sqlite.retrieveConnection(DATABASE_NAME, READ_ONLY);
  }

  return sqlite.createConnection(
    DATABASE_NAME,
    false,
    DATABASE_MODE,
    DATABASE_VERSION,
    READ_ONLY,
  );
}

async function initializeDatabase() {
  await initializeWebSqlite();
  await registerDatabaseMigrations(sqlite, DATABASE_NAME);
  const connection = await createOrRetrieveConnection();
  const state = await connection.isDBOpen();

  if (!state.result) {
    await connection.open();
  }

  const foreignKeysResult = await connection.execute('PRAGMA foreign_keys = ON;', false);
  assertSqliteSucceeded(foreignKeysResult, 'habilitar as chaves estrangeiras');

  return connection;
}

/**
 * Opens the app database once and returns its shared SQLiteDBConnection.
 * Schema creation and upgrades are delegated to migrations.js.
 *
 * @returns {Promise<import('@capacitor-community/sqlite').SQLiteDBConnection>}
 */
export function openDatabase() {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

/** Closes the shared connection, mainly for app shutdown and local tooling. */
export async function closeDatabase() {
  if (!databasePromise) {
    return;
  }

  await databasePromise;
  await sqlite.closeConnection(DATABASE_NAME, READ_ONLY);
  databasePromise = null;
}
