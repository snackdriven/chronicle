/**
 * Shared TypeScript types for Memory MCP Server
 */

// Timeline Event Types
export interface TimelineEvent {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp in milliseconds
  date: string;                  // YYYY-MM-DD
  type: string;                  // jira_ticket, spotify_play, calendar_event, journal_entry
  namespace?: string;            // daily:YYYY-MM-DD, dev:context
  title?: string;                // Human-readable summary
  metadata?: Record<string, any>; // JSON: lightweight data (always loaded)
  full_data_key?: string | null; // Key to full_details table (lazy-loaded)
  created_at: number;            // Unix timestamp
  updated_at: number;            // Unix timestamp
}

export interface TimelineEventInput {
  timestamp: number | string;    // Unix timestamp or ISO string
  type: string;
  title?: string;
  metadata?: Record<string, any>;
  namespace?: string;
}

export interface TimelineQuery {
  date: string;                  // YYYY-MM-DD
  type?: string;                 // Filter by type
  limit?: number;                // Max results (default: 1000)
}

export interface TimelineResponse {
  events: TimelineEvent[];
  stats: {
    total: number;
    by_type: Record<string, number>;
  };
}

// Full Details Types
export interface FullDetails {
  key: string;                   // Primary key
  data: Record<string, any>;     // Full JSON payload
  created_at: number;
  accessed_at: number;
}

// Memory (Key-Value) Types
export interface Memory {
  key: string;
  value: any;                    // Can be any JSON-serializable value
  namespace?: string;
  created_at: number;
  updated_at: number;
  expires_at?: number | null;    // TTL support (NULL = never expires)
}

export interface MemoryInput {
  key: string;
  value: any;
  namespace?: string;
  ttl?: number;                  // Seconds until expiration
}

export interface MemoryMetadata {
  key: string;
  value: any;
  metadata: {
    namespace?: string;
    created_at: number;
    updated_at: number;
    expires_at?: number | null;
  };
}

// Entity Types
export interface Entity {
  id: string;                    // UUID or slug (person:kayla-gilbert)
  type: string;                  // person, project, artist, ticket
  name: string;                  // Display name (searchable)
  properties: Record<string, any>; // JSON blob of properties
  created_at: number;
  updated_at: number;
}

export interface EntityInput {
  type: string;
  name: string;
  properties?: Record<string, any>;
}

export interface EntityVersion {
  id: number;                    // Auto-increment
  entity_id: string;             // FK to entities
  version: number;               // Version number
  properties: Record<string, any>; // Snapshot of properties
  changed_by: string;            // Who made the change
  changed_at: number;            // When it changed
  change_reason?: string;        // Why it changed
}

// Relation Types
export interface Relation {
  id: string;                    // UUID
  from_entity_id: string;        // FK to entities
  relation_type: string;         // assigned_to, worked_on, listened_to, attended
  to_entity_id: string;          // FK to entities
  properties?: Record<string, any>; // JSON: timestamps, context
  created_at: number;
}

export interface RelationInput {
  from: string;                  // Entity name or ID
  relation: string;              // Relation type
  to: string;                    // Entity name or ID
  properties?: Record<string, any>;
}

// Database Error Types
export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
