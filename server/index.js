import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// ============================================================================
// MCP Proxy - Chronicle Operations
// ============================================================================

/**
 * Valid MCP tool names for chronicle server
 */
const VALID_MCP_TOOLS = {
  // Timeline tools
  'store_timeline_event': { category: 'timeline', description: 'Store a new timeline event' },
  'get_timeline': { category: 'timeline', description: 'Get events for a specific date' },
  'get_event': { category: 'timeline', description: 'Get a single event by ID' },
  'expand_event': { category: 'timeline', description: 'Store full event data' },
  'get_timeline_range': { category: 'timeline', description: 'Get events across date range' },
  'delete_event': { category: 'timeline', description: 'Delete a timeline event' },
  'update_event': { category: 'timeline', description: 'Update an existing event' },
  'get_timeline_summary': { category: 'timeline', description: 'Get event statistics' },
  'get_event_types': { category: 'timeline', description: 'Get all event types' },

  // Memory (KV) tools
  'store_memory': { category: 'memory', description: 'Store a key-value memory' },
  'retrieve_memory': { category: 'memory', description: 'Retrieve a memory by key' },
  'delete_memory': { category: 'memory', description: 'Delete a memory by key' },
  'list_memories': { category: 'memory', description: 'List all memories' },
  'search_memories': { category: 'memory', description: 'Search memories by content' },
  'bulk_store_memories': { category: 'memory', description: 'Store multiple memories' },
  'bulk_delete_memories': { category: 'memory', description: 'Delete memories by pattern' },
  'has_memory': { category: 'memory', description: 'Check if memory exists' },
  'update_memory_ttl': { category: 'memory', description: 'Update memory TTL' },
  'get_memory_stats': { category: 'memory', description: 'Get memory statistics' },
  'clean_expired_memories': { category: 'memory', description: 'Clean expired memories' },
};

/**
 * Call MCP tool by spawning the chronicle server process
 */
async function callMCPTool(toolName, args = {}) {
  // Use dashboard's chronicle MCP server (shared database)
  const mcpServerPath = resolve(join(__dirname, '..', '..', '..', 'projects', 'chronicle', 'dist', 'mcp-server.js'));
  const dbPath = resolve(join(__dirname, '..', '..', '..', '.swarm', 'chronicle.db'));

  return new Promise((resolvePromise, reject) => {
    const mcpProcess = spawn('node', [mcpServerPath], {
      env: {
        ...process.env,
        CHRONICLE_DB_PATH: dbPath,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutHandle;

    timeoutHandle = setTimeout(() => {
      mcpProcess.kill();
      reject(new Error('MCP operation timed out after 30 seconds'));
    }, 30000);

    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcpProcess.on('close', (code) => {
      clearTimeout(timeoutHandle);

      if (code !== 0 && code !== null) {
        console.error(`MCP process exited with code ${code}`);
        console.error('stderr:', stderr);
        return reject(new Error(`MCP process failed with exit code ${code}`));
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        let toolResponse = null;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.result && Array.isArray(parsed.result.content)) {
              toolResponse = parsed.result;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!toolResponse) {
          return reject(new Error('No valid MCP response received'));
        }

        const content = toolResponse.content[0];
        if (content && content.type === 'text') {
          const result = JSON.parse(content.text);

          if (toolResponse.isError || result.error || result.success === false) {
            return reject(new Error(result.error || result.message || 'MCP tool execution failed'));
          }

          resolvePromise(result);
        } else {
          reject(new Error('Invalid MCP response format'));
        }
      } catch (parseError) {
        console.error('Failed to parse MCP response:', parseError);
        console.error('stdout:', stdout);
        reject(new Error(`Failed to parse MCP response: ${parseError.message}`));
      }
    });

    mcpProcess.on('error', (error) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Failed to spawn MCP process: ${error.message}`));
    });

    try {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }) + '\n';

      mcpProcess.stdin.write(request);
      mcpProcess.stdin.end();
    } catch (writeError) {
      clearTimeout(timeoutHandle);
      mcpProcess.kill();
      reject(new Error(`Failed to write to MCP process: ${writeError.message}`));
    }
  });
}

/**
 * POST /api/mcp/chronicle
 * Proxy endpoint for chronicle MCP server operations
 */
app.post('/api/mcp/chronicle', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tool, arguments: args } = req.body;

    if (!tool || typeof tool !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "tool" parameter',
        hint: 'Request body must include { tool: string, arguments?: object }'
      });
    }

    if (!VALID_MCP_TOOLS[tool]) {
      const toolsList = Object.keys(VALID_MCP_TOOLS).join(', ');
      const availableTools = Object.entries(VALID_MCP_TOOLS).map(([name, info]) => ({
        name,
        category: info.category,
        description: info.description,
      }));

      return res.status(400).json({
        error: `Unknown tool: ${tool}`,
        hint: 'Valid tools: ' + toolsList,
        availableTools,
      });
    }

    if (args !== undefined && (typeof args !== 'object' || Array.isArray(args))) {
      return res.status(400).json({
        error: 'Invalid "arguments" parameter',
        hint: 'Arguments must be an object (or omitted for tools with no parameters)'
      });
    }

    const argsPreview = args ? JSON.stringify(args).substring(0, 100) : '(no args)';
    console.log(`[MCP] Calling tool: ${tool}`, argsPreview);

    const result = await callMCPTool(tool, args || {});

    const duration = Date.now() - startTime;
    console.log(`[MCP] Tool ${tool} completed in ${duration}ms`);

    res.json({
      success: true,
      data: result,
      meta: {
        tool,
        category: VALID_MCP_TOOLS[tool].category,
        duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[MCP] Error after ${duration}ms:`, error.message);

    res.status(500).json({
      error: error.message || 'MCP operation failed',
      meta: {
        tool: req.body?.tool,
        duration,
      },
    });
  }
});

/**
 * GET /api/mcp/chronicle/tools
 * List all available MCP tools
 */
app.get('/api/mcp/chronicle/tools', (req, res) => {
  const tools = Object.entries(VALID_MCP_TOOLS).map(([name, info]) => ({
    name,
    category: info.category,
    description: info.description,
  }));

  const byCategory = {
    timeline: tools.filter(t => t.category === 'timeline'),
    memory: tools.filter(t => t.category === 'memory'),
  };

  const toolCount = Object.keys(VALID_MCP_TOOLS).length;

  res.json({
    tools,
    byCategory,
    totalCount: toolCount,
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const toolCount = Object.keys(VALID_MCP_TOOLS).length;

app.listen(PORT, () => {
  console.log(`=� Chronicle server running on http://localhost:${PORT}`);
  console.log(`<� MCP Proxy: /api/mcp/chronicle (${toolCount} tools)`);
  console.log(`=� Database: Shared with dashboard (.swarm/chronicle.db)`);
});
