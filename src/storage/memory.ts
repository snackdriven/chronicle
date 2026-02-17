/**
 * Memory (Key-Value) Operations
 * Store and retrieve development context and configuration
 */

import { getDB } from './db.js';
import {
  Memory,
  MemoryInput,
  MemoryMetadata,
  NotFoundError,
  ValidationError,
} from '../types.js';

/**
 * Store a memory
 * @returns Success boolean
 */
export function storeMemory(input: MemoryInput): boolean {
  const db = getDB();

  // Validate input
  if (!input.key) {
    throw new ValidationError('Memory key is required');
  }

  if (input.value === undefined) {
    throw new ValidationError('Memory value is required');
  }

  const now = Date.now();

  // Calculate expires_at if TTL provided
  let expires_at: number | null = null;
  if (input.ttl && input.ttl > 0) {
    expires_at = now + (input.ttl * 1000); // Convert seconds to milliseconds
  }

  // Serialize value
  const valueJson = JSON.stringify(input.value);

  // Check if key exists (for update vs insert)
  const existing = db.prepare('SELECT key FROM memories WHERE key = ?').get(input.key) as { key: string } | undefined;

  if (existing) {
    // Update existing memory
    const stmt = db.prepare(`
      UPDATE memories
      SET value = ?, namespace = ?, updated_at = ?, expires_at = ?
      WHERE key = ?
    `);

    stmt.run(
      valueJson,
      input.namespace || null,
      now,
      expires_at,
      input.key
    );
  } else {
    // Insert new memory
    const stmt = db.prepare(`
      INSERT INTO memories (key, value, namespace, created_at, updated_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.key,
      valueJson,
      input.namespace || null,
      now,
      now,
      expires_at
    );
  }

  return true;
}

/**
 * Retrieve a memory by key
 */
export function retrieveMemory(key: string): MemoryMetadata {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM memories WHERE key = ?');
  const row = stmt.get(key) as any;

  if (!row) {
    throw new NotFoundError(`Memory not found: ${key}`);
  }

  // Check if expired
  const now = Date.now();
  if (row.expires_at && row.expires_at <= now) {
    // Delete expired memory
    db.prepare('DELETE FROM memories WHERE key = ?').run(key);
    throw new NotFoundError(`Memory expired: ${key}`);
  }

  return {
    key: row.key,
    value: JSON.parse(row.value),
    metadata: {
      namespace: row.namespace,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    },
  };
}

/**
 * Delete a memory
 */
export function deleteMemory(key: string): boolean {
  const db = getDB();

  const stmt = db.prepare('DELETE FROM memories WHERE key = ?');
  const result = stmt.run(key);

  return result.changes > 0;
}

/**
 * List memories with optional filtering
 */
export function listMemories(namespace?: string, pattern?: string): Memory[] {
  const db = getDB();

  let sql = 'SELECT * FROM memories';
  const params: any[] = [];
  const conditions: string[] = [];

  // Filter by namespace
  if (namespace) {
    conditions.push('namespace = ?');
    params.push(namespace);
  }

  // Filter by key pattern (using LIKE)
  if (pattern) {
    // Convert glob-style pattern to SQL LIKE pattern
    // e.g., "dev:*" -> "dev:%"
    const likePattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');
    conditions.push('key LIKE ?');
    params.push(likePattern);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY updated_at DESC';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  // Filter out expired memories and parse
  const now = Date.now();
  const memories: Memory[] = [];

  rows.forEach(row => {
    // Skip expired
    if (row.expires_at && row.expires_at <= now) {
      return;
    }

    memories.push({
      key: row.key,
      value: JSON.parse(row.value),
      namespace: row.namespace,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    });
  });

  return memories;
}

/**
 * Clean up expired memories
 * @returns Number of memories deleted
 */
export function cleanExpiredMemories(): number {
  const db = getDB();
  const now = Date.now();

  const stmt = db.prepare('DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at <= ?');
  const result = stmt.run(now);

  return result.changes;
}

/**
 * Get memory count by namespace
 */
export function getMemoryStats(): {
  total: number;
  by_namespace: Record<string, number>;
  expired: number;
} {
  const db = getDB();
  const now = Date.now();

  // Total count
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number };
  const total = totalRow.count;

  // Count by namespace
  const namespaceRows = db.prepare(`
    SELECT namespace, COUNT(*) as count
    FROM memories
    GROUP BY namespace
  `).all() as Array<{ namespace: string | null; count: number }>;

  const by_namespace: Record<string, number> = {};
  namespaceRows.forEach(row => {
    const ns = row.namespace || 'default';
    by_namespace[ns] = row.count;
  });

  // Count expired
  const expiredRow = db.prepare(
    'SELECT COUNT(*) as count FROM memories WHERE expires_at IS NOT NULL AND expires_at <= ?'
  ).get(now) as { count: number };
  const expired = expiredRow.count;

  return {
    total,
    by_namespace,
    expired,
  };
}

/**
 * Search memories by value content
 * (Simple text search in JSON values)
 */
export function searchMemories(searchTerm: string, namespace?: string): Memory[] {
  const db = getDB();

  let sql = 'SELECT * FROM memories WHERE value LIKE ?';
  const params: any[] = [`%${searchTerm}%`];

  if (namespace) {
    sql += ' AND namespace = ?';
    params.push(namespace);
  }

  sql += ' ORDER BY updated_at DESC LIMIT 100';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  // Filter out expired memories and parse
  const now = Date.now();
  const memories: Memory[] = [];

  rows.forEach(row => {
    // Skip expired
    if (row.expires_at && row.expires_at <= now) {
      return;
    }

    memories.push({
      key: row.key,
      value: JSON.parse(row.value),
      namespace: row.namespace,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    });
  });

  return memories;
}

/**
 * Bulk store memories (transaction)
 */
export function bulkStoreMemories(inputs: MemoryInput[]): number {
  const db = getDB();

  const transaction = db.transaction(() => {
    inputs.forEach(input => {
      storeMemory(input);
    });
  });

  transaction();

  return inputs.length;
}

/**
 * Bulk delete memories by pattern
 */
export function bulkDeleteMemories(pattern: string): number {
  const db = getDB();

  // Convert glob-style pattern to SQL LIKE pattern
  const likePattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');

  const stmt = db.prepare('DELETE FROM memories WHERE key LIKE ?');
  const result = stmt.run(likePattern);

  return result.changes;
}

/**
 * Check if a memory exists and is not expired
 */
export function hasMemory(key: string): boolean {
  const db = getDB();
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT key FROM memories
    WHERE key = ?
    AND (expires_at IS NULL OR expires_at > ?)
  `);

  const row = stmt.get(key, now);
  return row !== undefined;
}

/**
 * Get or set a memory (retrieve if exists, store if not)
 */
export function getOrSetMemory(key: string, defaultValue: any, namespace?: string, ttl?: number): any {
  try {
    const memory = retrieveMemory(key);
    return memory.value;
  } catch (e) {
    if (e instanceof NotFoundError) {
      storeMemory({ key, value: defaultValue, namespace, ttl });
      return defaultValue;
    }
    throw e;
  }
}

/**
 * Update memory TTL
 */
export function updateMemoryTTL(key: string, ttl: number | null): boolean {
  const db = getDB();

  let expires_at: number | null = null;
  if (ttl !== null && ttl > 0) {
    expires_at = Date.now() + (ttl * 1000);
  }

  const stmt = db.prepare('UPDATE memories SET expires_at = ?, updated_at = ? WHERE key = ?');
  const result = stmt.run(expires_at, Date.now(), key);

  return result.changes > 0;
}

/**
 * Rename a memory key
 */
export function renameMemory(oldKey: string, newKey: string): boolean {
  const db = getDB();

  // Check if old key exists
  const existing = db.prepare('SELECT key FROM memories WHERE key = ?').get(oldKey);
  if (!existing) {
    throw new NotFoundError(`Memory not found: ${oldKey}`);
  }

  // Check if new key already exists
  const conflict = db.prepare('SELECT key FROM memories WHERE key = ?').get(newKey);
  if (conflict) {
    throw new ValidationError(`Memory already exists with key: ${newKey}`);
  }

  const stmt = db.prepare('UPDATE memories SET key = ?, updated_at = ? WHERE key = ?');
  const result = stmt.run(newKey, Date.now(), oldKey);

  return result.changes > 0;
}
