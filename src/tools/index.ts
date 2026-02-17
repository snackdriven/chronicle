/**
 * MCP Tools Entry Point
 * Aggregates all MCP tools and handlers for easy registration
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { timelineTools, timelineHandlers } from './timeline-tools.js';
import { memoryTools, memoryHandlers } from './memory-tools.js';

// ============================================================================
// Aggregated Exports
// ============================================================================

/**
 * All MCP tools combined
 */
export const allTools: Tool[] = [
  ...timelineTools,
  ...memoryTools,
];

/**
 * All tool handlers combined
 */
export const allHandlers: Record<string, (args: unknown) => Promise<any>> = {
  ...timelineHandlers,
  ...memoryHandlers,
};

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return allTools.find(tool => tool.name === name);
}

/**
 * Get a handler by tool name
 */
export function getHandler(name: string): ((args: unknown) => Promise<any>) | undefined {
  return allHandlers[name];
}

/**
 * Check if a tool exists
 */
export function hasTool(name: string): boolean {
  return allHandlers.hasOwnProperty(name);
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return allTools.map(tool => tool.name);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: 'timeline' | 'memory'): Tool[] {
  if (category === 'timeline') {
    return timelineTools;
  } else if (category === 'memory') {
    return memoryTools;
  }
  return [];
}

// ============================================================================
// Re-exports
// ============================================================================

// Timeline tools
export {
  timelineTools,
  timelineHandlers,
  storeTimelineEventTool,
  getTimelineTool,
  getEventTool,
  expandEventTool,
  getTimelineRangeTool,
  deleteEventTool,
  updateEventTool,
  getTimelineSummaryTool,
  getEventTypesTool,
} from './timeline-tools.js';

// Memory tools
export {
  memoryTools,
  memoryHandlers,
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
} from './memory-tools.js';
