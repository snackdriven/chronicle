/**
 * Memory Manager Types
 *
 * Type definitions for timeline events and KV memories from chronicle MCP server
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

export interface TimelineEventUpdate {
  title?: string;
  metadata?: Record<string, any>;
  namespace?: string;
  timestamp?: number;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  stats: {
    total: number;
    by_type: Record<string, number>;
  };
}

// Memory (Key-Value) Types
export interface KVMemory {
  key: string;
  value: any;                    // Can be any JSON-serializable value
  namespace?: string;
  created_at: number;
  updated_at: number;
  expires_at?: number | null;    // TTL support (NULL = never expires)
}

export interface KVMemoryInput {
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

// MCP API Response Types
export interface MCPSuccessResponse<T = any> {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: false;
  _meta?: {
    data?: T;
  };
}

export interface MCPErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: true;
}

export type MCPResponse<T = any> = MCPSuccessResponse<T> | MCPErrorResponse;

// Table Component Types
// Generic table meta that works with both TimelineEvent and KVMemory
export interface TableMeta<TData = unknown> {
  updateEvent: (id: string, updates: any) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  openEditModal: (item: TData) => void;
}

// Specific table meta for Timeline events
export interface TimelineTableMeta extends TableMeta<TimelineEvent> {
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  openEditModal: (event: TimelineEvent) => void;
}

// Specific table meta for KV memories
export interface KVTableMeta extends TableMeta<KVMemory> {
  updateEvent: (key: string, updates: any) => Promise<void>;
  deleteEvent: (key: string) => Promise<void>;
  openEditModal: (memory: KVMemory) => void;
}

// Helper type to ensure row data has an ID field
export type WithId<T> = T & { id: string };

// Helper type for row data that can be either TimelineEvent or KVMemory
export type MemoryRowData = TimelineEvent | KVMemory;

// Type guard to check if item is a TimelineEvent
export function isTimelineEvent(item: MemoryRowData): item is TimelineEvent {
  return 'timestamp' in item && 'type' in item;
}

// Type guard to check if item is a KVMemory
export function isKVMemory(item: MemoryRowData): item is KVMemory {
  return 'key' in item && 'value' in item && !('timestamp' in item);
}

// Helper to extract ID from either TimelineEvent or KVMemory
export function getRowId(item: MemoryRowData): string {
  return isTimelineEvent(item) ? item.id : item.key;
}

// UI Types
export type MemoryTab = 'timeline' | 'kv';

// Export Types
export type ExportFormat = 'csv' | 'json' | 'clipboard';
export type ExportDataType = 'timeline' | 'memory';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportDataType;
  filename?: string;
}

// Bulk Operation Types
export interface BulkDeleteResult {
  deleted: number;
  failed: number;
  errors?: string[];
}
