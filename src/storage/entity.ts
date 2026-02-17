/**
 * Entity CRUD Operations
 * Store and query entities (people, projects, artists) and their relationships
 */

import { getDB } from './db.js';
import {
  Entity,
  EntityInput,
  EntityVersion,
  Relation,
  RelationInput,
  NotFoundError,
  ValidationError,
} from '../types.js';
import { randomUUID } from 'crypto';

/**
 * Escape special LIKE pattern characters to prevent SQL injection
 * Escapes: %, _, and \
 */
function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore
}

/**
 * Create a new entity
 */
export function createEntity(input: EntityInput, createdBy: string = 'system'): Entity {
  const db = getDB();

  // Validate input
  if (!input.type) {
    throw new ValidationError('Entity type is required');
  }
  if (!input.name) {
    throw new ValidationError('Entity name is required');
  }

  // Check if entity with same name already exists
  const existing = db.prepare('SELECT id FROM entities WHERE name = ?').get(input.name);
  if (existing) {
    throw new ValidationError(`Entity already exists with name: ${input.name}`);
  }

  const id = randomUUID();
  const now = Date.now();
  const properties = input.properties || {};

  const transaction = db.transaction(() => {
    // Insert entity
    db.prepare(`
      INSERT INTO entities (id, type, name, properties, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.type, input.name, JSON.stringify(properties), now, now);

    // Create initial version
    db.prepare(`
      INSERT INTO entity_versions (entity_id, version, properties, changed_by, changed_at, change_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, 1, JSON.stringify(properties), createdBy, now, 'Initial creation');
  });

  transaction();

  return getEntity(id);
}

/**
 * Get entity by ID or name
 */
export function getEntity(idOrName: string): Entity {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM entities WHERE id = ? OR name = ?');
  const row = stmt.get(idOrName, idOrName) as any;

  if (!row) {
    throw new NotFoundError(`Entity not found: ${idOrName}`);
  }

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    properties: JSON.parse(row.properties),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * List entities by type
 */
export function listEntitiesByType(type: string, limit: number = 1000): Entity[] {
  const db = getDB();

  const stmt = db.prepare(`
    SELECT * FROM entities
    WHERE type = ?
    ORDER BY name ASC
    LIMIT ?
  `);
  const rows = stmt.all(type, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    name: row.name,
    properties: JSON.parse(row.properties),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * List all entities (with optional limit)
 */
export function listAllEntities(limit: number = 1000): Entity[] {
  const db = getDB();

  const stmt = db.prepare(`
    SELECT * FROM entities
    ORDER BY type, name ASC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as any[];

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    name: row.name,
    properties: JSON.parse(row.properties),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Update entity properties
 */
export function updateEntity(
  idOrName: string,
  properties: Record<string, any>,
  changedBy: string = 'system',
  changeReason?: string
): Entity {
  const db = getDB();

  // Get existing entity
  const entity = getEntity(idOrName);

  const now = Date.now();

  // Get current version number
  const versionRow = db.prepare(`
    SELECT MAX(version) as max_version
    FROM entity_versions
    WHERE entity_id = ?
  `).get(entity.id) as { max_version: number | null };

  const newVersion = (versionRow.max_version || 0) + 1;

  const transaction = db.transaction(() => {
    // Update entity
    db.prepare(`
      UPDATE entities
      SET properties = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(properties), now, entity.id);

    // Create version snapshot
    db.prepare(`
      INSERT INTO entity_versions (entity_id, version, properties, changed_by, changed_at, change_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entity.id, newVersion, JSON.stringify(properties), changedBy, now, changeReason || null);
  });

  transaction();

  return getEntity(entity.id);
}

/**
 * Delete entity (and all its relations)
 */
export function deleteEntity(idOrName: string): boolean {
  const db = getDB();

  // Get entity to ensure it exists
  const entity = getEntity(idOrName);

  // Delete will cascade to versions and relations due to FK constraints
  db.prepare('DELETE FROM entities WHERE id = ?').run(entity.id);

  return true;
}

/**
 * Get entity version history
 */
export function getEntityVersions(idOrName: string, limit: number = 100): EntityVersion[] {
  const db = getDB();

  // Get entity to ensure it exists
  const entity = getEntity(idOrName);

  const stmt = db.prepare(`
    SELECT * FROM entity_versions
    WHERE entity_id = ?
    ORDER BY version DESC
    LIMIT ?
  `);
  const rows = stmt.all(entity.id, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    entity_id: row.entity_id,
    version: row.version,
    properties: JSON.parse(row.properties),
    changed_by: row.changed_by,
    changed_at: row.changed_at,
    change_reason: row.change_reason,
  }));
}

/**
 * Create a relation between two entities
 */
export function createRelation(input: RelationInput, _createdBy: string = 'system'): Relation {
  const db = getDB();

  // Validate input
  if (!input.from || !input.relation || !input.to) {
    throw new ValidationError('From entity, relation type, and to entity are required');
  }

  // Resolve entity IDs
  const fromEntity = getEntity(input.from);
  const toEntity = getEntity(input.to);

  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO relations (id, from_entity_id, relation_type, to_entity_id, properties, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    fromEntity.id,
    input.relation,
    toEntity.id,
    input.properties ? JSON.stringify(input.properties) : null,
    now
  );

  return getRelation(id);
}

/**
 * Get relation by ID
 */
export function getRelation(id: string): Relation {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM relations WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) {
    throw new NotFoundError(`Relation not found: ${id}`);
  }

  return {
    id: row.id,
    from_entity_id: row.from_entity_id,
    relation_type: row.relation_type,
    to_entity_id: row.to_entity_id,
    properties: row.properties ? JSON.parse(row.properties) : undefined,
    created_at: row.created_at,
  };
}

/**
 * Get relations for an entity
 */
export function getEntityRelations(
  idOrName: string,
  direction: 'from' | 'to' | 'both' = 'both',
  relationType?: string
): Relation[] {
  const db = getDB();

  // Get entity to ensure it exists
  const entity = getEntity(idOrName);

  let sql: string;
  const params: any[] = [];

  if (direction === 'from') {
    sql = 'SELECT * FROM relations WHERE from_entity_id = ?';
    params.push(entity.id);
  } else if (direction === 'to') {
    sql = 'SELECT * FROM relations WHERE to_entity_id = ?';
    params.push(entity.id);
  } else {
    sql = 'SELECT * FROM relations WHERE from_entity_id = ? OR to_entity_id = ?';
    params.push(entity.id, entity.id);
  }

  if (relationType) {
    sql += ' AND relation_type = ?';
    params.push(relationType);
  }

  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    id: row.id,
    from_entity_id: row.from_entity_id,
    relation_type: row.relation_type,
    to_entity_id: row.to_entity_id,
    properties: row.properties ? JSON.parse(row.properties) : undefined,
    created_at: row.created_at,
  }));
}

/**
 * Delete a relation
 */
export function deleteRelation(id: string): boolean {
  const db = getDB();

  const result = db.prepare('DELETE FROM relations WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Get timeline events for an entity
 * Searches for entity references in metadata
 */
export function getEntityTimeline(idOrName: string, limit: number = 100): any[] {
  const db = getDB();

  // Get entity to ensure it exists
  const entity = getEntity(idOrName);

  // Search for entity in metadata JSON
  // This is a simple text search - in production you'd use JSON functions
  const escapedName = escapeLikePattern(entity.name);
  const stmt = db.prepare(`
    SELECT * FROM timeline_events
    WHERE metadata LIKE ? ESCAPE '\\'
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(`%${escapedName}%`, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    date: row.date,
    type: row.type,
    namespace: row.namespace,
    title: row.title,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    full_data_key: row.full_data_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Search entities by name or properties
 */
export function searchEntities(searchTerm: string, type?: string, limit: number = 100): Entity[] {
  const db = getDB();

  const escapedTerm = escapeLikePattern(searchTerm);
  let sql = `SELECT * FROM entities WHERE (name LIKE ? OR properties LIKE ?) ESCAPE '\\'`;
  const params: any[] = [`%${escapedTerm}%`, `%${escapedTerm}%`];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY name ASC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    name: row.name,
    properties: JSON.parse(row.properties),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Get entity type statistics
 */
export function getEntityTypeStats(): Record<string, number> {
  const db = getDB();

  const stmt = db.prepare('SELECT type, COUNT(*) as count FROM entities GROUP BY type');
  const rows = stmt.all() as Array<{ type: string; count: number }>;

  const result: Record<string, number> = {};
  rows.forEach(row => {
    result[row.type] = row.count;
  });

  return result;
}
