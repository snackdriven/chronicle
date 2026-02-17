import { z } from 'zod';

/**
 * Validation schema for Timeline Events
 * Used for creating and editing timeline events in the memory system
 */
export const timelineEventSchema = z.object({
  timestamp: z.string().datetime().or(z.coerce.date()),
  type: z.string().min(1, 'Event type is required'),
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  namespace: z.string()
    .regex(/^[a-z0-9_-]+$/, 'Namespace must contain only lowercase letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal('')),
  metadata: z.record(z.any()).optional(),
});

export type TimelineEventFormData = z.infer<typeof timelineEventSchema>;

/**
 * Validation schema for KV (Key-Value) Memories
 * Supports TTL with automatic unit conversion
 */
export const kvMemorySchema = z.object({
  key: z.string()
    .min(1, 'Key is required')
    .max(100, 'Key must be 100 characters or less')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Key must contain only letters, numbers, dots, hyphens, and underscores'),
  value: z.any(), // Will be validated as JSON
  namespace: z.string()
    .regex(/^[a-z0-9_-]+$/, 'Namespace must contain only lowercase letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal('')),
  ttl: z.number().int().positive('TTL must be a positive number').optional(),
  ttlUnit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
});

export type KVMemoryFormData = z.infer<typeof kvMemorySchema>;

/**
 * Event type options for timeline events
 */
export const EVENT_TYPES = [
  { value: 'jira_ticket', label: 'JIRA Ticket' },
  { value: 'spotify_play', label: 'Spotify Play' },
  { value: 'calendar_event', label: 'Calendar Event' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'github_commit', label: 'GitHub Commit' },
] as const;

/**
 * TTL unit options with conversion factors to seconds
 */
export const TTL_UNITS = [
  { value: 'seconds', label: 'Seconds', multiplier: 1 },
  { value: 'minutes', label: 'Minutes', multiplier: 60 },
  { value: 'hours', label: 'Hours', multiplier: 3600 },
  { value: 'days', label: 'Days', multiplier: 86400 },
] as const;

/**
 * Convert TTL with unit to seconds
 */
export function convertTTLToSeconds(ttl: number, unit: string): number {
  const unitConfig = TTL_UNITS.find(u => u.value === unit);
  return ttl * (unitConfig?.multiplier ?? 1);
}

/**
 * Convert seconds to TTL with appropriate unit
 * Returns the largest unit that produces a whole number
 */
export function convertSecondsToTTL(seconds: number): { ttl: number; unit: string } {
  for (let i = TTL_UNITS.length - 1; i >= 0; i--) {
    const unit = TTL_UNITS[i];
    if (seconds % unit.multiplier === 0) {
      return {
        ttl: seconds / unit.multiplier,
        unit: unit.value,
      };
    }
  }
  return { ttl: seconds, unit: 'seconds' };
}

/**
 * Validate JSON string
 */
export function validateJSON(jsonString: string): { valid: boolean; error?: string; parsed?: any } {
  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, parsed };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}
