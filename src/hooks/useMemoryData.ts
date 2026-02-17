/**
 * Memory Data Hook
 *
 * Fetches and manages timeline events and KV memories from MCP server
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelineResponse, KVMemory, MCPResponse } from '@/types/memory';

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
  console.log('[callMCPTool] Calling:', toolName, 'with args:', args);

  const response = await fetch(MCP_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: toolName, arguments: args }),
  });

  console.log('[callMCPTool] Response status:', response.status);
  console.log('[callMCPTool] Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    console.error('[callMCPTool] HTTP error:', error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[callMCPTool] Response data (full):', data);

  // Backend returns {success: true, data: {...}, meta: {...}}
  // The data field contains the MCP response: {success: true, data: {actual data}}
  console.log('[callMCPTool] Checking data structure:', {
    'data.success': data.success,
    'data.data exists': !!data.data,
    'data.data type': typeof data.data,
  });

  if (data.success && data.data) {
    const mcpResponse = data.data;
    console.log('[callMCPTool] MCP Response:', mcpResponse);
    console.log('[callMCPTool] MCP Response structure:', {
      'mcpResponse.success': mcpResponse.success,
      'mcpResponse.data exists': !!mcpResponse.data,
      'mcpResponse.data type': typeof mcpResponse.data,
    });

    // MCP response has another success/data wrapper
    if (mcpResponse.success && mcpResponse.data) {
      console.log('[callMCPTool] Returning nested data:', mcpResponse.data);
      return mcpResponse.data as T;
    }
    // If no inner wrapper, return directly
    console.log('[callMCPTool] Returning mcpResponse directly:', mcpResponse);
    return mcpResponse as T;
  }

  // Fallback to parsing as MCP response
  console.log('[callMCPTool] Using fallback parsing');
  const parsed = parseMCPResponse<T>(data as MCPResponse<T>);
  console.log('[callMCPTool] Parsed result:', parsed);
  return parsed;
}

/**
 * Get date string for N days ago
 */
function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get today's date string
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

export interface UseMemoryDataOptions {
  /** Number of days to fetch timeline events for (default: 7) */
  timelineDays?: number;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Namespace filter for KV memories (optional) */
  kvNamespace?: string;
}

export interface UseMemoryDataReturn {
  // Timeline data
  timelineEvents: TimelineEvent[];
  timelineStats: {
    total: number;
    by_type: Record<string, number>;
  } | null;

  // KV data
  kvMemories: KVMemory[];

  // Loading states
  isLoadingTimeline: boolean;
  isLoadingKV: boolean;
  isLoading: boolean;

  // Error states
  timelineError: Error | null;
  kvError: Error | null;

  // Actions
  refreshTimeline: () => Promise<void>;
  refreshKV: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching timeline events and KV memories
 */
export function useMemoryData(options: UseMemoryDataOptions = {}): UseMemoryDataReturn {
  const { timelineDays = 7, autoFetch = true, kvNamespace } = options;

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineStats, setTimelineStats] = useState<{
    total: number;
    by_type: Record<string, number>;
  } | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<Error | null>(null);

  // KV state
  const [kvMemories, setKVMemories] = useState<KVMemory[]>([]);
  const [isLoadingKV, setIsLoadingKV] = useState(false);
  const [kvError, setKVError] = useState<Error | null>(null);

  /**
   * Fetch timeline events for date range
   */
  const refreshTimeline = useCallback(async () => {
    console.log('[useMemoryData] refreshTimeline called, timelineDays:', timelineDays);
    setIsLoadingTimeline(true);
    setTimelineError(null);
    try {
      const startDate = getDaysAgo(timelineDays);
      const endDate = getToday();
      console.log('[useMemoryData] Date range:', { startDate, endDate });

      const result = await callMCPTool<TimelineResponse>('get_timeline_range', {
        start_date: startDate,
        end_date: endDate,
        limit: 1000,
      });

      console.log('[useMemoryData] Raw result from callMCPTool:', result);
      console.log('[useMemoryData] Result structure:', {
        'result.events exists': !!result.events,
        'result.events type': typeof result.events,
        'result.events length': Array.isArray(result.events) ? result.events.length : 'N/A',
        'result.stats exists': !!result.stats,
      });

      const events = result.events || [];
      const stats = result.stats || { total: 0, by_type: {} };

      console.log('[useMemoryData] Setting timeline events:', events);
      console.log('[useMemoryData] Setting timeline stats:', stats);

      setTimelineEvents(events);
      setTimelineStats(stats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch timeline events');
      console.error('[useMemoryData] Error in refreshTimeline:', error);
      setTimelineError(error);
    } finally {
      setIsLoadingTimeline(false);
      console.log('[useMemoryData] refreshTimeline completed');
    }
  }, [timelineDays]);

  /**
   * Fetch KV memories
   */
  const refreshKV = useCallback(async () => {
    console.log('[useMemoryData] refreshKV called, namespace:', kvNamespace);
    setIsLoadingKV(true);
    setKVError(null);
    try {
      const result = await callMCPTool<{ memories: KVMemory[]; count: number }>('list_memories', {
        namespace: kvNamespace,
      });

      console.log('[useMemoryData] KV result from callMCPTool:', result);
      console.log('[useMemoryData] KV result structure:', {
        'result.memories exists': !!result.memories,
        'result.memories type': typeof result.memories,
        'result.memories length': Array.isArray(result.memories) ? result.memories.length : 'N/A',
        'result.count': result.count,
      });

      const memories = result.memories || [];
      console.log('[useMemoryData] Setting KV memories:', memories);

      setKVMemories(memories);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch KV memories');
      console.error('[useMemoryData] Error in refreshKV:', error);
      setKVError(error);
    } finally {
      setIsLoadingKV(false);
      console.log('[useMemoryData] refreshKV completed');
    }
  }, [kvNamespace]);

  /**
   * Refresh both timeline and KV data
   */
  const refresh = useCallback(async () => {
    await Promise.all([refreshTimeline(), refreshKV()]);
  }, [refreshTimeline, refreshKV]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Only depend on autoFetch, refresh is stable via useCallback

  return {
    // Timeline data
    timelineEvents,
    timelineStats,

    // KV data
    kvMemories,

    // Loading states
    isLoadingTimeline,
    isLoadingKV,
    isLoading: isLoadingTimeline || isLoadingKV,

    // Error states
    timelineError,
    kvError,

    // Actions
    refreshTimeline,
    refreshKV,
    refresh,
  };
}
