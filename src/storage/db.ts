/**
 * Database Connection & Initialization
 * SQLite with WAL mode for concurrent access
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default database path (can be overridden via env var)
const DEFAULT_DB_PATH = path.join(__dirname, '../../data/chronicle.db');
const DB_PATH = process.env.CHRONICLE_DB_PATH || DEFAULT_DB_PATH;

let dbInstance: Database.Database | null = null;

/**
 * Initialize database with WAL mode and create schema
 */
export function initDB(verbose = false): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(DB_PATH, { verbose: verbose ? console.log : undefined });

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Configure for concurrent access
  db.pragma('busy_timeout = 5000'); // Wait up to 5 seconds for locks
  db.pragma('synchronous = NORMAL'); // Faster writes, still safe with WAL

  // Foreign keys enabled for referential integrity
  db.pragma('foreign_keys = ON');

  // Create schema
  createSchema(db);

  dbInstance = db;
  return db;
}

/**
 * Get existing database instance
 */
export function getDB(): Database.Database {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Create all database tables and indexes
 */
function createSchema(db: Database.Database): void {
  // Timeline Events - Primary temporal table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      namespace TEXT,
      title TEXT,
      metadata TEXT,
      full_data_key TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Indexes for timeline_events
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(date);
    CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON timeline_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(type);
    CREATE INDEX IF NOT EXISTS idx_timeline_namespace ON timeline_events(namespace);
    CREATE INDEX IF NOT EXISTS idx_timeline_date_type ON timeline_events(date, type);
  `);

  // Full Details - Lazy-loaded event details
  db.exec(`
    CREATE TABLE IF NOT EXISTS full_details (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      accessed_at INTEGER NOT NULL
    );
  `);

  // Index for LRU cache tracking
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_full_details_accessed ON full_details(accessed_at);
  `);

  // Memories - Key-value for dev context
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      namespace TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER
    );
  `);

  // Indexes for memories
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_namespace ON memories(namespace);
    CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at);
  `);

  // Entities - People, projects, artists
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      properties TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Indexes for entities
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
  `);

  // Entity Versions - Version history
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      properties TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changed_at INTEGER NOT NULL,
      change_reason TEXT,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
  `);

  // Indexes for entity_versions
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entity_versions_entity ON entity_versions(entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_versions_changed_at ON entity_versions(changed_at);
  `);

  // Relations - Entity relationships
  db.exec(`
    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      from_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      to_entity_id TEXT NOT NULL,
      properties TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (from_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (to_entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
  `);

  // Indexes for relations
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rel_from ON relations(from_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_to ON relations(to_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_type ON relations(relation_type);
    CREATE INDEX IF NOT EXISTS idx_rel_from_type ON relations(from_entity_id, relation_type);
    CREATE INDEX IF NOT EXISTS idx_rel_to_type ON relations(to_entity_id, relation_type);
  `);

  // Schema version tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT
    );
  `);

  // Initialize schema version
  const versionCheck = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;

  if (!versionCheck) {
    db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(
      1,
      Date.now(),
      'Initial schema creation'
    );
  }
}

/**
 * Get database statistics
 */
export function getStats(): {
  eventCount: number;
  memoryCount: number;
  entityCount: number;
  relationCount: number;
  journalMode: string;
  busyTimeout: number;
  dbPath: string;
  dbSize: number;
} {
  const db = getDB();

  const eventCount = (db.prepare('SELECT COUNT(*) as count FROM timeline_events').get() as { count: number }).count;
  const memoryCount = (db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }).count;
  const entityCount = (db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number }).count;
  const relationCount = (db.prepare('SELECT COUNT(*) as count FROM relations').get() as { count: number }).count;

  const journalMode = db.pragma('journal_mode', { simple: true }) as string;
  const busyTimeout = db.pragma('busy_timeout', { simple: true }) as number;

  // Get database file size
  const pageCount = db.pragma('page_count', { simple: true }) as number;
  const pageSize = db.pragma('page_size', { simple: true }) as number;
  const dbSize = pageCount * pageSize;

  return {
    eventCount,
    memoryCount,
    entityCount,
    relationCount,
    journalMode,
    busyTimeout,
    dbPath: DB_PATH,
    dbSize,
  };
}

/**
 * Run a transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const db = getDB();
  const tx = db.transaction(fn);
  return tx(db);
}

/**
 * Vacuum database (clean up and optimize)
 */
export function vacuum(): void {
  const db = getDB();
  db.exec('VACUUM');
}

/**
 * Clean up expired memories
 */
export function cleanExpiredMemories(): number {
  const db = getDB();
  const now = Date.now();

  const stmt = db.prepare('DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at <= ?');
  const result = stmt.run(now);

  return result.changes;
}

/**
 * Get database health check
 */
export function healthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    connection: boolean;
    wal_mode: boolean;
    foreign_keys: boolean;
    writable: boolean;
  };
  error?: string;
} {
  try {
    const db = getDB();

    const walMode = db.pragma('journal_mode', { simple: true }) === 'wal';
    const foreignKeys = db.pragma('foreign_keys', { simple: true }) === 1;

    // Test write
    let writable = false;
    try {
      db.exec('BEGIN IMMEDIATE');
      db.exec('ROLLBACK');
      writable = true;
    } catch (e) {
      writable = false;
    }

    const checks = {
      connection: true,
      wal_mode: walMode,
      foreign_keys: foreignKeys,
      writable,
    };

    const allHealthy = Object.values(checks).every(v => v === true);
    const status = allHealthy ? 'healthy' : 'degraded';

    return { status, checks };
  } catch (error) {
    return {
      status: 'unhealthy',
      checks: {
        connection: false,
        wal_mode: false,
        foreign_keys: false,
        writable: false,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
