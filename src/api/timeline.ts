/**
 * Timeline API Routes
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import {
  storeTimelineEvent,
  getTimeline,
  getEvent,
  getEventWithFullDetails,
  expandEvent,
  getTimelineRange,
  getTimelineSummary,
  updateEvent,
  deleteEvent,
} from '../storage/timeline.js';
import { ValidationError, NotFoundError } from '../types.js';

export const timelineRouter: ExpressRouter = Router();

// Zod schemas for validation
const TimelineEventSchema = z.object({
  timestamp: z.union([z.number(), z.string()]),
  type: z.string().min(1),
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  namespace: z.string().optional(),
});

const ExpandEventSchema = z.object({
  full_data: z.record(z.any()),
});

const DateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

/**
 * GET /api/timeline/:date
 * Get all events for a specific date (metadata only)
 */
timelineRouter.get('/:date', async (req: Request, res: Response) => {
  try {
    const date = DateParamSchema.parse(req.params.date);
    const type = req.query.type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const result = getTimeline({ date, type, limit });

    res.json({
      success: true,
      data: result,
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
 * GET /api/timeline/:date/:event_id/full
 * Get event with full details expanded
 */
timelineRouter.get('/:date/:event_id/full', async (req: Request, res: Response) => {
  try {
    const event = getEventWithFullDetails(req.params.event_id);

    res.json({
      success: true,
      data: event,
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
 * POST /api/timeline/:event_id/expand
 * Store full details for an event
 */
timelineRouter.post('/:event_id/expand', async (req: Request, res: Response) => {
  try {
    const validated = ExpandEventSchema.parse(req.body);
    const event = expandEvent(req.params.event_id, validated.full_data);

    res.json({
      success: true,
      data: event,
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
 * GET /api/timeline/range
 * Get events across a date range
 */
timelineRouter.get('/range', async (req: Request, res: Response) => {
  try {
    const start = DateParamSchema.parse(req.query.start);
    const end = DateParamSchema.parse(req.query.end);
    const type = req.query.type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const result = getTimelineRange(start, end, type, limit);

    res.json({
      success: true,
      data: result,
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
 * GET /api/timeline/:date/summary
 * Get daily stats without full event list
 */
timelineRouter.get('/:date/summary', async (req: Request, res: Response) => {
  try {
    const date = DateParamSchema.parse(req.params.date);
    const summary = getTimelineSummary(date);

    res.json({
      success: true,
      data: summary,
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
 * POST /api/timeline
 * Create new timeline event manually
 */
timelineRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = TimelineEventSchema.parse(req.body);
    const eventId = storeTimelineEvent(validated);
    const event = getEvent(eventId);

    res.status(201).json({
      success: true,
      data: event,
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
 * PUT /api/timeline/:event_id
 * Update an existing timeline event
 */
timelineRouter.put('/:event_id', async (req: Request, res: Response) => {
  try {
    const updates = TimelineEventSchema.partial().parse(req.body);
    const event = updateEvent(req.params.event_id, updates);

    res.json({
      success: true,
      data: event,
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
 * DELETE /api/timeline/:event_id
 * Delete a timeline event
 */
timelineRouter.delete('/:event_id', async (req: Request, res: Response) => {
  try {
    deleteEvent(req.params.event_id);

    res.json({
      success: true,
      data: { message: 'Event deleted successfully' },
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
