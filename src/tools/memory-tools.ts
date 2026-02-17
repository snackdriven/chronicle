/**
 * MCP Tools for Memory (Key-Value) Operations
 * Exposes persistent key-value storage to Claude via MCP protocol
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as memory from '../storage/memory.js';
import {
  storeMemorySchema,
  retrieveMemorySchema,
  deleteMemorySchema,
  listMemoriesSchema,
  searchMemoriesSchema,
  bulkStoreMemoriesSchema,
  bulkDeleteMemoriesSchema,
  hasMemorySchema,
  updateMemoryTTLSchema,
  getMemoryStatsSchema,
  cleanExpiredMemoriesSchema,
  toJsonSchema,
  validateInput,
  errorResponse,
  successResponse,
} from '../utils/validation.js';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool: store_memory
 * Store a key-value memory
 */
export const storeMemoryTool: Tool = {
  name: 'store_memory',
  description: 'Store a key-value memory for persistent context. Supports namespaces and TTL. Values can be any JSON-serializable data.',
  inputSchema: toJsonSchema(storeMemorySchema),
};

/**
 * Tool: retrieve_memory
 * Retrieve a memory by key
 */
export const retrieveMemoryTool: Tool = {
  name: 'retrieve_memory',
  description: 'Retrieve a memory by its key. Returns the value and metadata (created_at, updated_at, expires_at).',
  inputSchema: toJsonSchema(retrieveMemorySchema),
};

/**
 * Tool: delete_memory
 * Delete a memory by key
 */
export const deleteMemoryTool: Tool = {
  name: 'delete_memory',
  description: 'Delete a memory by its key. Returns true if the memory was deleted, false if not found.',
  inputSchema: toJsonSchema(deleteMemorySchema),
};

/**
 * Tool: list_memories
 * List memories with optional filtering
 */
export const listMemoriesTool: Tool = {
  name: 'list_memories',
  description: 'List all memories, optionally filtered by namespace or key pattern. Supports wildcard patterns (e.g., "dev:*").',
  inputSchema: toJsonSchema(listMemoriesSchema),
};

/**
 * Tool: search_memories
 * Search memories by value content
 */
export const searchMemoriesTool: Tool = {
  name: 'search_memories',
  description: 'Search memories by text content in values. Useful for finding memories containing specific information.',
  inputSchema: toJsonSchema(searchMemoriesSchema),
};

/**
 * Tool: bulk_store_memories
 * Store multiple memories in a transaction
 */
export const bulkStoreMemoriesTool: Tool = {
  name: 'bulk_store_memories',
  description: 'Store multiple memories in a single transaction for better performance.',
  inputSchema: toJsonSchema(bulkStoreMemoriesSchema),
};

/**
 * Tool: bulk_delete_memories
 * Delete multiple memories by pattern
 */
export const bulkDeleteMemoriesTool: Tool = {
  name: 'bulk_delete_memories',
  description: 'Delete multiple memories matching a key pattern (e.g., "temp:*"). Use with caution.',
  inputSchema: toJsonSchema(bulkDeleteMemoriesSchema),
};

/**
 * Tool: has_memory
 * Check if a memory exists
 */
export const hasMemoryTool: Tool = {
  name: 'has_memory',
  description: 'Check if a memory exists and is not expired without retrieving its value.',
  inputSchema: toJsonSchema(hasMemorySchema),
};

/**
 * Tool: update_memory_ttl
 * Update or remove TTL for a memory
 */
export const updateMemoryTTLTool: Tool = {
  name: 'update_memory_ttl',
  description: 'Update the TTL (time-to-live) for a memory. Set to null to remove expiration.',
  inputSchema: toJsonSchema(updateMemoryTTLSchema),
};

/**
 * Tool: get_memory_stats
 * Get memory statistics
 */
export const getMemoryStatsTool: Tool = {
  name: 'get_memory_stats',
  description: 'Get statistics about stored memories (total count, count by namespace, expired count).',
  inputSchema: toJsonSchema(getMemoryStatsSchema),
};

/**
 * Tool: clean_expired_memories
 * Clean up expired memories
 */
export const cleanExpiredMemoriesTool: Tool = {
  name: 'clean_expired_memories',
  description: 'Clean up all expired memories. Returns the number of memories deleted.',
  inputSchema: toJsonSchema(cleanExpiredMemoriesSchema),
};

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle store_memory
 */
export async function handleStoreMemory(args: unknown): Promise<any> {
  try {
    const input = validateInput(storeMemorySchema, args);
    // Zod validation ensures value is present
    const success = memory.storeMemory(input as any);
    return successResponse({ stored: success });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle retrieve_memory
 */
export async function handleRetrieveMemory(args: unknown): Promise<any> {
  try {
    const input = validateInput(retrieveMemorySchema, args);
    const result = memory.retrieveMemory(input.key);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle delete_memory
 */
export async function handleDeleteMemory(args: unknown): Promise<any> {
  try {
    const input = validateInput(deleteMemorySchema, args);
    const deleted = memory.deleteMemory(input.key);
    return successResponse({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle list_memories
 */
export async function handleListMemories(args: unknown): Promise<any> {
  try {
    const input = validateInput(listMemoriesSchema, args);
    const memories = memory.listMemories(input.namespace, input.pattern);
    return successResponse({ memories, count: memories.length });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle search_memories
 */
export async function handleSearchMemories(args: unknown): Promise<any> {
  try {
    const input = validateInput(searchMemoriesSchema, args);
    const memories = memory.searchMemories(input.search_term, input.namespace);
    return successResponse({ memories, count: memories.length });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle bulk_store_memories
 */
export async function handleBulkStoreMemories(args: unknown): Promise<any> {
  try {
    const input = validateInput(bulkStoreMemoriesSchema, args);
    // Zod validation ensures value is present in each memory
    const count = memory.bulkStoreMemories(input.memories as any);
    return successResponse({ stored: count });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle bulk_delete_memories
 */
export async function handleBulkDeleteMemories(args: unknown): Promise<any> {
  try {
    const input = validateInput(bulkDeleteMemoriesSchema, args);
    const count = memory.bulkDeleteMemories(input.pattern);
    return successResponse({ deleted: count });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle has_memory
 */
export async function handleHasMemory(args: unknown): Promise<any> {
  try {
    const input = validateInput(hasMemorySchema, args);
    const exists = memory.hasMemory(input.key);
    return successResponse({ exists });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle update_memory_ttl
 */
export async function handleUpdateMemoryTTL(args: unknown): Promise<any> {
  try {
    const input = validateInput(updateMemoryTTLSchema, args);
    const updated = memory.updateMemoryTTL(input.key, input.ttl);
    return successResponse({ updated });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle get_memory_stats
 */
export async function handleGetMemoryStats(_args: unknown): Promise<any> {
  try {
    const stats = memory.getMemoryStats();
    return successResponse(stats);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Handle clean_expired_memories
 */
export async function handleCleanExpiredMemories(_args: unknown): Promise<any> {
  try {
    const count = memory.cleanExpiredMemories();
    return successResponse({ deleted: count });
  } catch (error) {
    return errorResponse(error);
  }
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * All memory tools
 */
export const memoryTools: Tool[] = [
  storeMemoryTool,
  retrieveMemoryTool,
  deleteMemoryTool,
  listMemoriesTool,
  searchMemoriesTool,
  bulkStoreMemoriesTool,
  bulkDeleteMemoriesTool,
  hasMemoryTool,
  updateMemoryTTLTool,
  getMemoryStatsTool,
  cleanExpiredMemoriesTool,
];

/**
 * Memory tool handlers mapped by name
 */
export const memoryHandlers: Record<string, (args: unknown) => Promise<any>> = {
  store_memory: handleStoreMemory,
  retrieve_memory: handleRetrieveMemory,
  delete_memory: handleDeleteMemory,
  list_memories: handleListMemories,
  search_memories: handleSearchMemories,
  bulk_store_memories: handleBulkStoreMemories,
  bulk_delete_memories: handleBulkDeleteMemories,
  has_memory: handleHasMemory,
  update_memory_ttl: handleUpdateMemoryTTL,
  get_memory_stats: handleGetMemoryStats,
  clean_expired_memories: handleCleanExpiredMemories,
};
