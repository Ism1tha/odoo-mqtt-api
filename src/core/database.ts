import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { terminal } from '../utils/terminal.js';

const { infoMessage } = terminal();

let db: Database | null = null;

/**
 * Initializes the SQLite database and creates the tasks table if it does not exist.
 * @param dbPath Path to the SQLite database file (default: './data.sqlite')
 */
export const setupDatabase = async (dbPath = './data.sqlite'): Promise<void> => {
  infoMessage(`Initializing database at ${dbPath}`);
  if (db) return;
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    odoo_production_id TEXT NOT NULL,
    mqtt_topic TEXT NOT NULL,
    binary_payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    error TEXT
  )`);
};

/**
 * Get the current database instance.
 * @returns Database instance
 * @throws Error if database is not initialized
 */
export const getDb = (): Database => {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  return db;
};

/**
 * Execute a SQL query and return all results.
 * @param sql SQL query string
 * @param params Query parameters
 * @returns Array of result rows
 */
export const query = async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  return db.all(sql, params);
};

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE).
 * @param sql SQL statement string
 * @param params Statement parameters
 */
export const run = async (sql: string, params: unknown[] = []): Promise<void> => {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  await db.run(sql, params);
};
