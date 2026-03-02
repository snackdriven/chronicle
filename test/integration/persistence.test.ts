/**
 * Persistence tests — use a real temp file, not :memory:
 * Verifies that data survives a full closeDB/initDB cycle,
 * which is the core contract of a memory keeper.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { closeDB } from '../../src/storage/db.js';

// Each test gets its own temp db file
let tempDir: string;
let dbPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'chronicle-test-'));
  dbPath = join(tempDir, 'test.db');
  process.env.CHRONICLE_DB_PATH = dbPath;
});

afterEach(() => {
  closeDB();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('data survives a restart', () => {
  it('KV memory written before closeDB is readable after reinit', async () => {
    // Dynamically import so CHRONICLE_DB_PATH is set first
    const { initDB, closeDB } = await import('../../src/storage/db.js');
    const { storeMemory, retrieveMemory } = await import('../../src/storage/memory.js');

    initDB();
    storeMemory({ key: 'session.context', value: { project: 'chronicle', branch: 'main' } });
    closeDB();

    // Simulate process restart: reinit hits the same file
    initDB();
    const result = retrieveMemory('session.context');
    expect(result.value).toEqual({ project: 'chronicle', branch: 'main' });
  });

  it('timeline event written before closeDB is readable after reinit', async () => {
    const { initDB, closeDB } = await import('../../src/storage/db.js');
    const { storeTimelineEvent, getTimeline } = await import('../../src/storage/timeline.js');

    const date = '2025-06-15';
    const ts = new Date(`${date}T10:00:00Z`).getTime();

    initDB();
    const id = storeTimelineEvent({ type: 'journal_entry', timestamp: ts, title: 'survived restart' });
    closeDB();

    initDB();
    const { events } = getTimeline({ date });
    expect(events.find(e => e.id === id)?.title).toBe('survived restart');
  });
});

describe('TTL expiry across cleanup runs', () => {
  it('cleanExpiredMemories removes expired entries from the real db', async () => {
    const { initDB, getDB, closeDB } = await import('../../src/storage/db.js');
    const { storeMemory, hasMemory, cleanExpiredMemories } = await import('../../src/storage/memory.js');

    initDB();

    storeMemory({ key: 'permanent', value: 'keep' });
    storeMemory({ key: 'temporary', value: 'delete me', ttl: 3600 });

    // Push expires_at into the past
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'temporary');

    const removed = cleanExpiredMemories();
    expect(removed).toBe(1);

    closeDB();
    initDB();

    // After restart, permanent entry still there, expired one is gone
    expect(hasMemory('permanent')).toBe(true);
    expect(hasMemory('temporary')).toBe(false);
  });
});
