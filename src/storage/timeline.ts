/**
 * Timeline CRUD Operations
 * Store and query temporal events with lazy-loaded details
 */

import { getDB } from './db.js';
import {
  TimelineEvent,
  TimelineEventInput,
  TimelineQuery,
  TimelineResponse,
  FullDetails,
  NotFoundError,
  ValidationError,
} from '../types.js';
import { randomUUID } from 'crypto';

/**
 * Store a timeline event
 * @returns Event ID
 */
export function storeTimelineEvent(input: TimelineEventInput): string {
  const db = getDB();

  // Validate input
  if (!input.type) {
    throw new ValidationError('Event type is required');
  }

  // Convert timestamp to Unix milliseconds
  let timestamp: number;
  if (typeof input.timestamp === 'string') {
    timestamp = new Date(input.timestamp).getTime();
  } else {
    timestamp = input.timestamp;
  }

  if (isNaN(timestamp)) {
    throw new ValidationError('Invalid timestamp');
  }

  // Generate ID and date
  const id = randomUUID();
  const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
  const now = Date.now();

  // Prepare data
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  // Insert event
  const stmt = db.prepare(`
    INSERT INTO timeline_events (
      id, timestamp, date, type, namespace, title, metadata, full_data_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    timestamp,
    date,
    input.type,
    input.namespace || null,
    input.title || null,
    metadataJson,
    null, // full_data_key starts as null
    now,
    now
  );

  return id;
}

/**
 * Get timeline for a specific date
 */
export function getTimeline(query: TimelineQuery): TimelineResponse {
  const db = getDB();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    throw new ValidationError('Date must be in YYYY-MM-DD format');
  }

  const limit = query.limit || 1000;

  // Build query
  let sql = 'SELECT * FROM timeline_events WHERE date = ?';
  const params: any[] = [query.date];

  if (query.type) {
    sql += ' AND type = ?';
    params.push(query.type);
  }

  sql += ' ORDER BY timestamp ASC LIMIT ?';
  params.push(limit);

  // Execute query
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  // Parse events
  const events: TimelineEvent[] = rows.map(row => ({
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

  // Calculate stats
  const total = events.length;
  const by_type: Record<string, number> = {};

  events.forEach(event => {
    by_type[event.type] = (by_type[event.type] || 0) + 1;
  });

  return {
    events,
    stats: {
      total,
      by_type,
    },
  };
}

/**
 * Get a single event by ID
 */
export function getEvent(event_id: string): TimelineEvent {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM timeline_events WHERE id = ?');
  const row = stmt.get(event_id) as any;

  if (!row) {
    throw new NotFoundError(`Event not found: ${event_id}`);
  }

  return {
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
  };
}

/**
 * Expand event with full details
 * Stores full data and returns updated event
 */
export function expandEvent(event_id: string, full_data: Record<string, any>): TimelineEvent {
  const db = getDB();

  // Check if event exists
  const event = getEvent(event_id);

  // Generate full_data_key if not exists
  let full_data_key = event.full_data_key;

  if (!full_data_key) {
    full_data_key = `${event.type}:${event_id}:full`;
  }

  const now = Date.now();

  // Begin transaction
  const transaction = db.transaction(() => {
    // Insert or replace full details
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO full_details (key, data, created_at, accessed_at)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(
      full_data_key,
      JSON.stringify(full_data),
      now,
      now
    );

    // Update event with full_data_key
    const updateStmt = db.prepare(`
      UPDATE timeline_events
      SET full_data_key = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(full_data_key, now, event_id);
  });

  transaction();

  // Return updated event
  return getEvent(event_id);
}

/**
 * Get full details for an event
 */
export function getFullDetails(full_data_key: string): FullDetails {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM full_details WHERE key = ?');
  const row = stmt.get(full_data_key) as any;

  if (!row) {
    throw new NotFoundError(`Full details not found: ${full_data_key}`);
  }

  // Update accessed_at
  const now = Date.now();
  db.prepare('UPDATE full_details SET accessed_at = ? WHERE key = ?').run(now, full_data_key);

  return {
    key: row.key,
    data: JSON.parse(row.data),
    created_at: row.created_at,
    accessed_at: now,
  };
}

/**
 * Get event with full details expanded
 */
export function getEventWithFullDetails(event_id: string): TimelineEvent & { full_data?: Record<string, any> } {
  const event = getEvent(event_id);

  if (event.full_data_key) {
    try {
      const fullDetails = getFullDetails(event.full_data_key);
      return {
        ...event,
        full_data: fullDetails.data,
      };
    } catch (e) {
      // If full details not found, return event without it
      return event;
    }
  }

  return event;
}

/**
 * Delete a timeline event
 */
export function deleteEvent(event_id: string): boolean {
  const db = getDB();

  // Get event to check if it has full details
  const event = getEvent(event_id);

  const transaction = db.transaction(() => {
    // Delete full details if exists
    if (event.full_data_key) {
      db.prepare('DELETE FROM full_details WHERE key = ?').run(event.full_data_key);
    }

    // Delete event
    const stmt = db.prepare('DELETE FROM timeline_events WHERE id = ?');
    stmt.run(event_id);
  });

  transaction();

  return true;
}

/**
 * Update an existing timeline event
 */
export function updateEvent(event_id: string, updates: Partial<TimelineEventInput>): TimelineEvent {
  const db = getDB();

  // Get existing event
  const event = getEvent(event_id);

  // Build update fields
  const fields: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    params.push(updates.title);
  }

  if (updates.metadata !== undefined) {
    fields.push('metadata = ?');
    params.push(JSON.stringify(updates.metadata));
  }

  if (updates.namespace !== undefined) {
    fields.push('namespace = ?');
    params.push(updates.namespace);
  }

  if (updates.timestamp !== undefined) {
    let timestamp: number;
    if (typeof updates.timestamp === 'string') {
      timestamp = new Date(updates.timestamp).getTime();
    } else {
      timestamp = updates.timestamp;
    }

    const date = new Date(timestamp).toISOString().split('T')[0];
    fields.push('timestamp = ?');
    fields.push('date = ?');
    params.push(timestamp, date);
  }

  if (fields.length === 0) {
    return event; // No updates
  }

  // Add updated_at
  fields.push('updated_at = ?');
  params.push(Date.now());

  // Add event_id to params
  params.push(event_id);

  // Execute update
  const sql = `UPDATE timeline_events SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return getEvent(event_id);
}

/**
 * Get timeline for a date range
 */
export function getTimelineRange(
  start_date: string,
  end_date: string,
  type?: string,
  limit?: number
): TimelineResponse {
  const db = getDB();

  // Validate date formats
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    throw new ValidationError('Dates must be in YYYY-MM-DD format');
  }

  const maxLimit = limit || 10000;

  // Build query
  let sql = 'SELECT * FROM timeline_events WHERE date >= ? AND date <= ?';
  const params: any[] = [start_date, end_date];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY timestamp ASC LIMIT ?';
  params.push(maxLimit);

  // Execute query
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  // Parse events
  const events: TimelineEvent[] = rows.map(row => ({
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

  // Calculate stats
  const total = events.length;
  const by_type: Record<string, number> = {};

  events.forEach(event => {
    by_type[event.type] = (by_type[event.type] || 0) + 1;
  });

  return {
    events,
    stats: {
      total,
      by_type,
    },
  };
}

/**
 * Get event types with counts
 */
export function getEventTypes(): Record<string, number> {
  const db = getDB();

  const stmt = db.prepare('SELECT type, COUNT(*) as count FROM timeline_events GROUP BY type ORDER BY count DESC');
  const rows = stmt.all() as Array<{ type: string; count: number }>;

  const result: Record<string, number> = {};
  rows.forEach(row => {
    result[row.type] = row.count;
  });

  return result;
}

/**
 * Get timeline summary for a date (stats only, no events)
 */
export function getTimelineSummary(date: string): {
  date: string;
  total: number;
  by_type: Record<string, number>;
} {
  const db = getDB();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('Date must be in YYYY-MM-DD format');
  }

  const stmt = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM timeline_events
    WHERE date = ?
    GROUP BY type
  `);

  const rows = stmt.all(date) as Array<{ type: string; count: number }>;

  const by_type: Record<string, number> = {};
  let total = 0;

  rows.forEach(row => {
    by_type[row.type] = row.count;
    total += row.count;
  });

  return {
    date,
    total,
    by_type,
  };
}
