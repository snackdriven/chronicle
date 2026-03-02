import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB, closeDB, getDB } from '../../src/storage/db.js';
import {
  storeMemory,
  retrieveMemory,
  hasMemory,
  listMemories,
  cleanExpiredMemories,
  deleteMemory,
  searchMemories,
  bulkStoreMemories,
  bulkDeleteMemories,
  updateMemoryTTL,
  getMemoryStats,
} from '../../src/storage/memory.js';
import { NotFoundError, ValidationError } from '../../src/types.js';

beforeEach(() => {
  closeDB();
  initDB();
});

afterEach(() => {
  closeDB();
});

describe('storeMemory + retrieveMemory', () => {
  it('round-trips a simple string value', () => {
    storeMemory({ key: 'foo', value: 'bar' });
    const result = retrieveMemory('foo');
    expect(result.value).toBe('bar');
    expect(result.key).toBe('foo');
  });

  it('round-trips a nested object without corruption', () => {
    const value = { nested: { arr: [1, 2, 3], flag: true } };
    storeMemory({ key: 'obj', value });
    expect(retrieveMemory('obj').value).toEqual(value);
  });

  it('overwrites an existing key rather than inserting a duplicate', () => {
    storeMemory({ key: 'k', value: 'first' });
    storeMemory({ key: 'k', value: 'second' });
    expect(retrieveMemory('k').value).toBe('second');
    expect(listMemories()).toHaveLength(1);
  });

  it('stores null as a value', () => {
    storeMemory({ key: 'nullable', value: null });
    expect(retrieveMemory('nullable').value).toBeNull();
  });
});

describe('validation', () => {
  it('throws ValidationError for empty key', () => {
    expect(() => storeMemory({ key: '', value: 'x' })).toThrow(ValidationError);
  });

  it('throws ValidationError for undefined value', () => {
    expect(() => storeMemory({ key: 'k', value: undefined })).toThrow(ValidationError);
  });

  it('throws NotFoundError for a key that does not exist', () => {
    expect(() => retrieveMemory('does-not-exist')).toThrow(NotFoundError);
  });
});

describe('TTL expiry', () => {
  it('throws NotFoundError after a memory expires', () => {
    storeMemory({ key: 'expired', value: 'gone', ttl: 3600 });
    // Manually push expires_at into the past
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'expired');

    expect(() => retrieveMemory('expired')).toThrow(NotFoundError);
  });

  it('hasMemory returns false for an expired key', () => {
    storeMemory({ key: 'exp2', value: 'x', ttl: 3600 });
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'exp2');

    expect(hasMemory('exp2')).toBe(false);
  });

  it('cleanExpiredMemories removes expired entries and leaves live ones', () => {
    storeMemory({ key: 'live', value: 'keep me' });
    storeMemory({ key: 'dead', value: 'delete me', ttl: 3600 });

    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'dead');

    const removed = cleanExpiredMemories();
    expect(removed).toBe(1);
    expect(hasMemory('live')).toBe(true);
    expect(hasMemory('dead')).toBe(false);
  });
});

describe('listMemories', () => {
  it('filters by namespace', () => {
    storeMemory({ key: 'a', value: 1, namespace: 'work' });
    storeMemory({ key: 'b', value: 2, namespace: 'personal' });
    storeMemory({ key: 'c', value: 3, namespace: 'work' });

    const work = listMemories('work');
    expect(work).toHaveLength(2);
    expect(work.every(m => m.namespace === 'work')).toBe(true);
  });

  it('excludes expired memories from list results', () => {
    storeMemory({ key: 'active', value: 1 });
    storeMemory({ key: 'stale', value: 2, ttl: 3600 });
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'stale');

    const results = listMemories();
    expect(results.map(m => m.key)).not.toContain('stale');
  });
});

describe('deleteMemory', () => {
  it('removes the key and returns true', () => {
    storeMemory({ key: 'del', value: 'x' });
    expect(deleteMemory('del')).toBe(true);
    expect(() => retrieveMemory('del')).toThrow(NotFoundError);
  });

  it('returns false when the key does not exist', () => {
    expect(deleteMemory('nonexistent')).toBe(false);
  });
});

describe('searchMemories', () => {
  it('finds memories whose serialized value contains the search term', () => {
    storeMemory({ key: 'a', value: 'the quick brown fox' });
    storeMemory({ key: 'b', value: 'a lazy dog' });
    storeMemory({ key: 'c', value: 42 });

    const results = searchMemories('fox');
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('a');
  });

  it('filters by namespace when provided', () => {
    storeMemory({ key: 'x', value: 'needle', namespace: 'work' });
    storeMemory({ key: 'y', value: 'needle', namespace: 'personal' });

    const results = searchMemories('needle', 'work');
    expect(results).toHaveLength(1);
    expect(results[0].namespace).toBe('work');
  });

});

describe('bulkStoreMemories', () => {
  it('stores all entries and returns the count', () => {
    const count = bulkStoreMemories([
      { key: 'bulk-a', value: 1 },
      { key: 'bulk-b', value: 2 },
      { key: 'bulk-c', value: 3 },
    ]);
    expect(count).toBe(3);
    expect(retrieveMemory('bulk-a').value).toBe(1);
    expect(retrieveMemory('bulk-c').value).toBe(3);
  });

  it('rolls back all entries if one fails validation', () => {
    expect(() =>
      bulkStoreMemories([
        { key: 'ok', value: 1 },
        { key: '', value: 2 }, // invalid — empty key
      ])
    ).toThrow(ValidationError);
    expect(hasMemory('ok')).toBe(false);
  });
});

describe('bulkDeleteMemories', () => {
  it('deletes entries matching a glob pattern and returns the count', () => {
    storeMemory({ key: 'temp:a', value: 1 });
    storeMemory({ key: 'temp:b', value: 2 });
    storeMemory({ key: 'keep', value: 3 });

    const deleted = bulkDeleteMemories('temp:*');
    expect(deleted).toBe(2);
    expect(hasMemory('temp:a')).toBe(false);
    expect(hasMemory('keep')).toBe(true);
  });

  it('returns 0 when no keys match', () => {
    expect(bulkDeleteMemories('nonexistent:*')).toBe(0);
  });
});

describe('updateMemoryTTL', () => {
  it('adds a TTL to a permanent key', () => {
    storeMemory({ key: 'target', value: 'x' });
    expect(updateMemoryTTL('target', 3600)).toBe(true);
    // Manually expire it to confirm the TTL was actually written
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'target');
    expect(hasMemory('target')).toBe(false);
  });

  it('clears an expired TTL, making the key accessible again', () => {
    storeMemory({ key: 'expiring', value: 'y', ttl: 3600 });
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'expiring');
    expect(hasMemory('expiring')).toBe(false);

    updateMemoryTTL('expiring', null);
    expect(hasMemory('expiring')).toBe(true);
  });

  it('returns false for a key that does not exist', () => {
    expect(updateMemoryTTL('ghost', 3600)).toBe(false);
  });
});

describe('getMemoryStats', () => {
  it('counts total, by namespace, and expired entries', () => {
    storeMemory({ key: 'a', value: 1, namespace: 'work' });
    storeMemory({ key: 'b', value: 2, namespace: 'work' });
    storeMemory({ key: 'c', value: 3, namespace: 'personal' });
    storeMemory({ key: 'd', value: 4, ttl: 3600 });
    getDB()
      .prepare('UPDATE memories SET expires_at = ? WHERE key = ?')
      .run(Date.now() - 1000, 'd');

    const stats = getMemoryStats();
    expect(stats.total).toBe(4);
    expect(stats.by_namespace['work']).toBe(2);
    expect(stats.by_namespace['personal']).toBe(1);
    expect(stats.expired).toBe(1);
  });
});
