/**
 * Entity API Routes
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import {
  createEntity,
  getEntity,
  listEntitiesByType,
  listAllEntities,
  updateEntity,
  deleteEntity,
  getEntityVersions,
  createRelation,
  getEntityRelations,
  getEntityTimeline,
  searchEntities,
  getEntityTypeStats,
} from '../storage/entity.js';
import { ValidationError, NotFoundError } from '../types.js';

export const entityRouter: ExpressRouter = Router();

// Zod schemas for validation
const EntityCreateSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

const EntityUpdateSchema = z.object({
  properties: z.record(z.any()),
  changed_by: z.string().optional(),
  change_reason: z.string().optional(),
});

const RelationCreateSchema = z.object({
  from: z.string().min(1),
  relation: z.string().min(1),
  to: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

/**
 * GET /api/entities/stats
 * Get entity type statistics
 */
entityRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = getEntityTypeStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/entities/search
 * Search entities by name or properties
 */
entityRouter.get('/search', async (req: Request, res: Response) => {
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

    const type = req.query.type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const entities = searchEntities(searchTerm, type, limit);

    res.json({
      success: true,
      data: entities,
    });
  } catch (error) {
    throw error;
  }
  return;
});

/**
 * GET /api/entities/:type
 * List entities by type
 */
entityRouter.get('/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

    // Special case: "all" type returns all entities
    const entities = type === 'all'
      ? listAllEntities(limit)
      : listEntitiesByType(type, limit);

    res.json({
      success: true,
      data: entities,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/entities/:type
 * Create new entity
 */
entityRouter.post('/:type', async (req: Request, res: Response) => {
  try {
    // Ensure type matches URL parameter
    const entityData = {
      ...req.body,
      type: req.params.type,
    };

    const validated = EntityCreateSchema.parse(entityData);
    const createdBy = req.headers['x-user-id'] as string || 'api-user';

    const entity = createEntity(validated, createdBy);

    res.status(201).json({
      success: true,
      data: entity,
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
      return;
    } else {
      throw error;
    }
  }
});

/**
 * GET /api/entities/:type/:name
 * Get specific entity
 */
entityRouter.get('/:type/:name', async (req: Request, res: Response) => {
  try {
    const entity = getEntity(req.params.name);

    // Verify type matches if not "all"
    if (req.params.type !== 'all' && entity.type !== req.params.type) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Entity not found: ${req.params.name}`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: entity,
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
      return;
    } else {
      throw error;
    }
  }
});

/**
 * PUT /api/entities/:type/:name
 * Update entity properties
 */
entityRouter.put('/:type/:name', async (req: Request, res: Response) => {
  try {
    const validated = EntityUpdateSchema.parse(req.body);
    const changedBy = validated.changed_by || (req.headers['x-user-id'] as string) || 'api-user';

    const entity = updateEntity(
      req.params.name,
      validated.properties,
      changedBy,
      validated.change_reason
    );

    res.json({
      success: true,
      data: entity,
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
    } else if (error instanceof NotFoundError) {
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
 * DELETE /api/entities/:type/:name
 * Delete entity
 */
entityRouter.delete('/:type/:name', async (req: Request, res: Response) => {
  try {
    deleteEntity(req.params.name);

    res.json({
      success: true,
      data: { message: 'Entity deleted successfully' },
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
 * GET /api/entities/:type/:name/timeline
 * Get timeline events for entity
 */
entityRouter.get('/:type/:name/timeline', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const events = getEntityTimeline(req.params.name, limit);

    res.json({
      success: true,
      data: events,
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
 * GET /api/entities/:type/:name/versions
 * Get entity version history
 */
entityRouter.get('/:type/:name/versions', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const versions = getEntityVersions(req.params.name, limit);

    res.json({
      success: true,
      data: versions,
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
 * GET /api/entities/:type/:name/relations
 * Get entity relations
 */
entityRouter.get('/:type/:name/relations', async (req: Request, res: Response) => {
  try {
    const direction = (req.query.direction as 'from' | 'to' | 'both') || 'both';
    const relationType = req.query.relation_type as string | undefined;

    const relations = getEntityRelations(req.params.name, direction, relationType);

    res.json({
      success: true,
      data: relations,
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
 * POST /api/entities/relations
 * Create a relation between entities
 */
entityRouter.post('/relations', async (req: Request, res: Response) => {
  try {
    const validated = RelationCreateSchema.parse(req.body);
    const createdBy = req.headers['x-user-id'] as string || 'api-user';

    const relation = createRelation(validated, createdBy);

    res.status(201).json({
      success: true,
      data: relation,
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
    } else if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(400).json({
        success: false,
        error: {
          code: error.name === 'NotFoundError' ? 'NOT_FOUND' : 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      throw error;
    }
  }
});
