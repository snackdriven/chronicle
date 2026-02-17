/**
 * Memory MCP Server - Main Entry Point
 * Exports all public APIs for the Memory MCP Server
 */

// ============================================================================
// Type Definitions
// ============================================================================

export * from './types.js';

// ============================================================================
// Storage Layer
// ============================================================================

export * as timeline from './storage/timeline.js';
export * as memory from './storage/memory.js';
export * as db from './storage/db.js';

// ============================================================================
// MCP Tools
// ============================================================================

export * from './tools/index.js';

// ============================================================================
// Validation
// ============================================================================

export * from './utils/validation.js';

// ============================================================================
// Server Creation Helpers (for MCP server implementation)
// ============================================================================

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { allTools, allHandlers } from './tools/index.js';
import { initDB } from './storage/db.js';

/**
 * Return type for initMemoryServer
 */
export interface MemoryServerInit {
  db: ReturnType<typeof initDB>;
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<any>>;
}

/**
 * Initialize the Memory MCP Server
 * Sets up the database and returns tools/handlers for MCP registration
 */
export function initMemoryServer(verbose = false): MemoryServerInit {
  // Initialize database
  const db = initDB(verbose);

  return {
    db,
    tools: allTools,
    handlers: allHandlers,
  };
}

/**
 * Default export for convenience
 */
export default {
  initMemoryServer,
  allTools,
  allHandlers,
};
