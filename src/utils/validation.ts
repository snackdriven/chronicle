/**
 * Validation utilities and Zod schemas for MCP tools
 * Provides input validation and JSON Schema conversion for MCP tool interfaces
 */

import { z } from 'zod';
// @ts-ignore - zod-to-json-schema has deep type instantiation issues
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Timeline Event Schemas
// ============================================================================

/**
 * Schema for storing a timeline event
 */
export const storeTimelineEventSchema = z.object({
  timestamp: z.union([z.number(), z.string()]).describe('Unix timestamp in milliseconds or ISO 8601 string'),
  type: z.string().describe('Event type (e.g., jira_ticket, spotify_play, calendar_event)'),
  title: z.string().optional().describe('Human-readable title/summary'),
  metadata: z.record(z.any()).optional().describe('Lightweight metadata stored inline'),
  namespace: z.string().optional().describe('Optional namespace for organizing events'),
});

/**
 * Schema for querying timeline by date
 */
export const getTimelineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
  type: z.string().optional().describe('Filter by event type'),
  limit: z.number().int().positive().optional().default(1000).describe('Maximum number of events to return'),
});

/**
 * Schema for getting a single event
 */
export const getEventSchema = z.object({
  event_id: z.string().describe('Event ID to retrieve'),
});

/**
 * Schema for expanding an event with full details
 */
export const expandEventSchema = z.object({
  event_id: z.string().describe('Event ID to expand'),
  full_data: z.record(z.any()).describe('Full event data to store'),
});

/**
 * Schema for getting timeline range
 */
export const getTimelineRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date in YYYY-MM-DD format'),
  type: z.string().optional().describe('Filter by event type'),
  limit: z.number().int().positive().optional().default(10000).describe('Maximum number of events to return'),
});

/**
 * Schema for deleting an event
 */
export const deleteEventSchema = z.object({
  event_id: z.string().describe('Event ID to delete'),
});

/**
 * Schema for updating an event
 */
export const updateEventSchema = z.object({
  event_id: z.string().describe('Event ID to update'),
  updates: z.object({
    title: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    namespace: z.string().optional(),
    timestamp: z.union([z.number(), z.string()]).optional(),
  }).describe('Fields to update'),
});

/**
 * Schema for getting timeline summary
 */
export const getTimelineSummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
});

// ============================================================================
// Memory (Key-Value) Schemas
// ============================================================================

/**
 * Schema for storing a memory
 */
export const storeMemorySchema = z.object({
  key: z.string().min(1).describe('Unique memory key'),
  value: z.any().describe('Value to store (any JSON-serializable data)'),
  namespace: z.string().optional().describe('Optional namespace for organizing memories'),
  ttl: z.number().int().positive().optional().describe('Time-to-live in seconds (optional)'),
}).required({ value: true });

/**
 * Schema for retrieving a memory
 */
export const retrieveMemorySchema = z.object({
  key: z.string().min(1).describe('Memory key to retrieve'),
});

/**
 * Schema for deleting a memory
 */
export const deleteMemorySchema = z.object({
  key: z.string().min(1).describe('Memory key to delete'),
});

/**
 * Schema for listing memories
 */
export const listMemoriesSchema = z.object({
  namespace: z.string().optional().describe('Filter by namespace'),
  pattern: z.string().optional().describe('Filter by key pattern (supports * wildcard)'),
});

/**
 * Schema for searching memories
 */
export const searchMemoriesSchema = z.object({
  search_term: z.string().min(1).describe('Text to search for in memory values'),
  namespace: z.string().optional().describe('Filter by namespace'),
});

/**
 * Schema for bulk storing memories
 */
export const bulkStoreMemoriesSchema = z.object({
  memories: z.array(storeMemorySchema).describe('Array of memories to store'),
});

/**
 * Schema for bulk deleting memories
 */
export const bulkDeleteMemoriesSchema = z.object({
  pattern: z.string().min(1).describe('Pattern for keys to delete (supports * wildcard)'),
});

/**
 * Schema for checking if memory exists
 */
export const hasMemorySchema = z.object({
  key: z.string().min(1).describe('Memory key to check'),
});

/**
 * Schema for updating memory TTL
 */
export const updateMemoryTTLSchema = z.object({
  key: z.string().min(1).describe('Memory key to update'),
  ttl: z.number().int().positive().nullable().describe('New TTL in seconds (null to remove expiration)'),
});

// ============================================================================
// Entity Schemas (for future implementation)
// ============================================================================

/**
 * Schema for creating/updating an entity
 */
export const upsertEntitySchema = z.object({
  id: z.string().optional().describe('Entity ID (optional for creation)'),
  type: z.string().describe('Entity type (e.g., person, project, artist)'),
  name: z.string().min(1).describe('Entity name'),
  properties: z.record(z.any()).optional().describe('Entity properties'),
});

/**
 * Schema for getting an entity
 */
export const getEntitySchema = z.object({
  id: z.string().describe('Entity ID'),
});

/**
 * Schema for creating a relation
 */
export const createRelationSchema = z.object({
  from: z.string().describe('Source entity ID or name'),
  relation: z.string().describe('Relation type'),
  to: z.string().describe('Target entity ID or name'),
  properties: z.record(z.any()).optional().describe('Relation properties'),
});

/**
 * Schema for querying relations
 */
export const queryRelationsSchema = z.object({
  from_entity_id: z.string().optional().describe('Filter by source entity'),
  to_entity_id: z.string().optional().describe('Filter by target entity'),
  relation_type: z.string().optional().describe('Filter by relation type'),
  limit: z.number().int().positive().optional().default(100).describe('Maximum number of relations'),
});

// ============================================================================
// Database Management Schemas
// ============================================================================

/**
 * Schema for getting database stats
 */
export const getStatsSchema = z.object({}).strict();

/**
 * Schema for health check
 */
export const healthCheckSchema = z.object({}).strict();

/**
 * Schema for cleaning expired memories
 */
export const cleanExpiredSchema = z.object({}).strict();

/**
 * Schema for get_event_types (no input)
 */
export const getEventTypesSchema = z.object({}).strict();

/**
 * Schema for get_memory_stats (no input)
 */
export const getMemoryStatsSchema = z.object({}).strict();

/**
 * Schema for clean_expired_memories (no input)
 */
export const cleanExpiredMemoriesSchema = z.object({}).strict();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a Zod schema to JSON Schema for MCP tool definitions
 */
export function toJsonSchema(schema: z.ZodTypeAny): any {
  // @ts-ignore - zodToJsonSchema has type instantiation issues
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  });
}

/**
 * Validate and parse input against a schema
 */
export function validateInput<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

/**
 * Safe validation that returns success/error result
 */
export function safeValidate<T>(schema: z.ZodType<T>, input: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }
}

/**
 * Create a standardized error response
 */
export function errorResponse(error: unknown): { error: string; details?: any } {
  if (error instanceof Error) {
    return {
      error: error.message,
      details: error instanceof z.ZodError ? error.errors : undefined,
    };
  }
  return { error: String(error) };
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
