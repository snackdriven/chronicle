#!/usr/bin/env node
/**
 * MCP Server Entry Point
 *
 * This file implements the stdio-based MCP server that communicates with Claude Code.
 * It registers all timeline and memory tools and handles tool execution requests.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { timelineTools, timelineHandlers } from './tools/timeline-tools.js';
import { memoryTools, memoryHandlers } from './tools/memory-tools.js';
import { initDB } from './storage/db.js';

// Initialize database on startup
initDB();

// Combine all tools and handlers
const allTools = [...timelineTools, ...memoryTools];
const allHandlers = { ...timelineHandlers, ...memoryHandlers };

// Create MCP server
const server = new Server(
  {
    name: '@projects-dashboard/chronicle',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = allHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const result = await handler(args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Return structured error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            success: false
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start stdio server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error('🏠 Chronicle - Your personal memory augmentation system');
  console.error(`Database: ${process.env.CHRONICLE_DB_PATH || 'default location'}`);
  console.error(`Tools registered: ${allTools.length}`);
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
