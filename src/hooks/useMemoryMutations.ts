/**
 * Memory Mutations Hook
 *
 * Provides CRUD operations for timeline events and KV memories via MCP server
 */

import { useState, useCallback } from 'react';
import type {
  TimelineEvent,
  TimelineEventInput,
  TimelineEventUpdate,
  KVMemoryInput,
  BulkDeleteResult,
  MCPResponse,
} from '@/types/memory';

// MCP API base URL - points to backend server
const MCP_API_BASE = 'http://localhost:3001/api/mcp/chronicle';

/**
 * Parse MCP response and extract data
 */
function parseMCPResponse<T>(response: MCPResponse<T>): T {
  if (response.isError) {
    const errorText = response.content?.[0]?.text || 'Unknown MCP error';
    throw new Error(errorText);
  }

  // Try to parse JSON from text content
  const textContent = response.content?.[0]?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent) as T;
    } catch {
      // If not JSON, return as-is
      return textContent as T;
    }
  }

  // Check _meta for data
  if (response._meta?.data) {
    return response._meta.data as T;
  }

  return response as T;
}

/**
 * Call MCP tool via backend API
 */
async function callMCPTool<T>(toolName: string, args: Record<string, any> = {}): Promise<T> {
  console.log('[callMCPTool:mutations] Calling:', toolName, 'with args:', args);

  const response = await fetch(MCP_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: toolName, arguments: args }),
  });

  console.log('[callMCPTool:mutations] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    console.error('[callMCPTool:mutations] HTTP error:', error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[callMCPTool:mutations] Response data:', data);

  // Backend returns {success: true, data: {...}, meta: {...}}
  // The data field contains the MCP response: {success: true, data: {actual data}}
  if (data.success && data.data) {
    const mcpResponse = data.data;
    console.log('[callMCPTool:mutations] MCP Response:', mcpResponse);
    // MCP response has another success/data wrapper
    if (mcpResponse.success && mcpResponse.data) {
      console.log('[callMCPTool:mutations] Returning nested data:', mcpResponse.data);
      return mcpResponse.data as T;
    }
    // If no inner wrapper, return directly
    console.log('[callMCPTool:mutations] Returning mcpResponse directly:', mcpResponse);
    return mcpResponse as T;
  }

  // Fallback to parsing as MCP response
  console.log('[callMCPTool:mutations] Using fallback parsing');
  return parseMCPResponse<T>(data as MCPResponse<T>);
}

export interface UseMemoryMutationsReturn {
  // Timeline mutations
  createTimelineEvent: (data: TimelineEventInput) => Promise<string>;
  updateTimelineEvent: (id: string, updates: TimelineEventUpdate) => Promise<TimelineEvent>;
  deleteTimelineEvent: (id: string) => Promise<boolean>;
  bulkDeleteTimeline: (ids: string[]) => Promise<BulkDeleteResult>;

  // KV mutations
  createKVMemory: (data: KVMemoryInput) => Promise<boolean>;
  updateKVMemory: (key: string, value: any, ttl?: number) => Promise<boolean>;
  deleteKVMemory: (key: string) => Promise<boolean>;
  bulkDeleteKV: (keys: string[]) => Promise<BulkDeleteResult>;

  // Loading and error states
  isLoading: boolean;
  error: Error | null;
  clearError: () => void;
}

/**
 * Hook for memory CRUD operations
 */
export function useMemoryMutations(): UseMemoryMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ============================================================================
  // Timeline Mutations
  // ============================================================================

  const createTimelineEvent = useCallback(async (data: TimelineEventInput): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callMCPTool<{ event_id: string }>('store_timeline_event', data);
      return result.event_id;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create timeline event');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTimelineEvent = useCallback(
    async (id: string, updates: TimelineEventUpdate): Promise<TimelineEvent> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await callMCPTool<TimelineEvent>('update_event', {
          event_id: id,
          updates,
        });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update timeline event');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteTimelineEvent = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callMCPTool<{ deleted: boolean }>('delete_event', {
        event_id: id,
      });
      return result.deleted;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete timeline event');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkDeleteTimeline = useCallback(async (ids: string[]): Promise<BulkDeleteResult> => {
    setIsLoading(true);
    setError(null);
    try {
      let deleted = 0;
      let failed = 0;
      const errors: string[] = [];

      // Delete events in parallel (limit concurrency to avoid overwhelming server)
      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((id) =>
            callMCPTool<{ deleted: boolean }>('delete_event', { event_id: id })
          )
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.deleted) {
            deleted++;
          } else {
            failed++;
            const reason =
              result.status === 'rejected' ? result.reason.message : 'Unknown error';
            errors.push(`Failed to delete ${batch[index]}: ${reason}`);
          }
        });
      }

      return { deleted, failed, errors: errors.length > 0 ? errors : undefined };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk delete timeline events');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // KV Memory Mutations
  // ============================================================================

  const createKVMemory = useCallback(async (data: KVMemoryInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callMCPTool<{ stored: boolean }>('store_memory', data);
      return result.stored;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create KV memory');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateKVMemory = useCallback(
    async (key: string, value: any, ttl?: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        // Update is same as store (upsert behavior)
        const result = await callMCPTool<{ stored: boolean }>('store_memory', {
          key,
          value,
          ttl,
        });
        return result.stored;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update KV memory');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteKVMemory = useCallback(async (key: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await callMCPTool<{ deleted: boolean }>('delete_memory', { key });
      return result.deleted;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete KV memory');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkDeleteKV = useCallback(async (keys: string[]): Promise<BulkDeleteResult> => {
    setIsLoading(true);
    setError(null);
    try {
      let deleted = 0;
      let failed = 0;
      const errors: string[] = [];

      // Delete memories in parallel (limit concurrency)
      const batchSize = 10;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((key) => callMCPTool<{ deleted: boolean }>('delete_memory', { key }))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.deleted) {
            deleted++;
          } else {
            failed++;
            const reason =
              result.status === 'rejected' ? result.reason.message : 'Unknown error';
            errors.push(`Failed to delete ${batch[index]}: ${reason}`);
          }
        });
      }

      return { deleted, failed, errors: errors.length > 0 ? errors : undefined };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk delete KV memories');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Timeline mutations
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    bulkDeleteTimeline,

    // KV mutations
    createKVMemory,
    updateKVMemory,
    deleteKVMemory,
    bulkDeleteKV,

    // State
    isLoading,
    error,
    clearError,
  };
}
