/**
 * Memory API Routes
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import {
  storeMemory,
  retrieveMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  getMemoryStats,
  bulkStoreMemories,
  bulkDeleteMemories,
  hasMemory,
  updateMemoryTTL,
  cleanExpiredMemories,
} from '../storage/memory.js';
import { ValidationError, NotFoundError } from '../types.js';

export const memoryRouter: ExpressRouter = Router();

// Zod schemas for validation
const MemoryStoreSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  namespace: z.string().optional(),
  ttl: z.number().optional(),
}).strict();

const BulkStoreSchema = z.object({
  memories: z.array(MemoryStoreSchema),
});

const BulkDeleteSchema = z.object({
  pattern: z.string().min(1),
});

const UpdateTTLSchema = z.object({
  ttl: z.number().nullable(),
});

/**
 * GET /api/memory/stats
 * Get memory statistics
 */
memoryRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = getMemoryStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/memory/search
 * Search memories by content
 */
memoryRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search term (q) is required',
        },
      });
    }

    const namespace = req.query.namespace as string | undefined;
    const memories = searchMemories(searchTerm, namespace);

    res.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    throw error;
  }
  return;
});

/**
 * GET /api/memory/list
 * List memories with optional filtering
 */
memoryRouter.get('/list', async (req: Request, res: Response) => {
  try {
    const namespace = req.query.namespace as string | undefined;
    const pattern = req.query.pattern as string | undefined;

    const memories = listMemories(namespace, pattern);

    res.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/memory/bulk
 * Bulk store memories
 */
memoryRouter.post('/bulk', async (req: Request, res: Response) => {
  try {
    const validated = BulkStoreSchema.parse(req.body);
    const count = bulkStoreMemories(validated.memories as any);

    res.status(201).json({
      success: true,
      data: {
        message: `${count} memories stored successfully`,
        count,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    } else if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      throw error;
    }
  }
});

/**
 * DELETE /api/memory/bulk
 * Bulk delete memories by pattern
 */
memoryRouter.delete('/bulk', async (req: Request, res: Response) => {
  try {
    const validated = BulkDeleteSchema.parse(req.body);
    const count = bulkDeleteMemories(validated.pattern);

    res.json({
      success: true,
      data: {
        message: `${count} memories deleted successfully`,
        count,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    } else {
      throw error;
    }
  }
});

/**
 * POST /api/memory/cleanup
 * Clean up expired memories
 */
memoryRouter.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    const count = cleanExpiredMemories();

    res.json({
      success: true,
      data: {
        message: `${count} expired memories cleaned up`,
        count,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/memory/:key/exists
 * Check if memory exists
 */
memoryRouter.get('/:key/exists', async (req: Request, _res: Response) => {
  try {
    const exists = hasMemory(req.params.key);

    _res.json({
      success: true,
      data: { exists },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/memory/:key
 * Retrieve a memory by key
 */
memoryRouter.get('/:key', async (req: Request, res: Response) => {
  try {
    const memory = retrieveMemory(req.params.key);

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      throw error;
    }
  }
});

/**
 * POST /api/memory
 * Store a memory
 */
memoryRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = MemoryStoreSchema.parse(req.body);
    storeMemory(validated as any);

    res.status(201).json({
      success: true,
      data: {
        message: 'Memory stored successfully',
        key: validated.key,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    } else if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      throw error;
    }
  }
});

/**
 * PUT /api/memory/:key/ttl
 * Update memory TTL
 */
memoryRouter.put('/:key/ttl', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = UpdateTTLSchema.parse(req.body);
    const updated = updateMemoryTTL(req.params.key, validated.ttl);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Memory not found: ${req.params.key}`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'TTL updated successfully',
        key: req.params.key,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
      return;
    } else {
      throw error;
    }
  }
});

/**
 * DELETE /api/memory/:key
 * Delete a memory
 */
memoryRouter.delete('/:key', async (req: Request, res: Response) => {
  try {
    const deleted = deleteMemory(req.params.key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Memory not found: ${req.params.key}`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Memory deleted successfully',
        key: req.params.key,
      },
    });
  } catch (error) {
    throw error;
  }
});
