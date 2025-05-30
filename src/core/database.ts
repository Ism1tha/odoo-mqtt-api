import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { terminal } from '../utils/terminal.js';

const { info } = terminal();

let db: Database | null = null;

export async function setupDatabase(dbPath = './data.sqlite'): Promise<void> {
  info(`Initializing database at ${dbPath}`);
  if (db) return;
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS robots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    topic TEXT NOT NULL
  )`);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  return db;
}

export async function query(sql: string, params: unknown[] = []): Promise<unknown[]> {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  return db.all(sql, params);
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  if (!db) throw new Error('Database not initialized. Call setupDatabase first.');
  await db.run(sql, params);
}
