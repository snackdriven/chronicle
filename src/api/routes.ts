/**
 * API Routes - Main Router
 * Combines all API routers into a single export
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { timelineRouter } from './timeline.js';
import { entityRouter } from './entity.js';
import { memoryRouter } from './memory.js';
import { insightsRouter } from './insights.js';
import { getStats, getDB } from '../storage/db.js';

export const apiRouter: ExpressRouter = Router();

// Mount sub-routers
apiRouter.use('/timeline', timelineRouter);
apiRouter.use('/entities', entityRouter);
apiRouter.use('/memory', memoryRouter);
apiRouter.use('/insights', insightsRouter);

// Root API info endpoint
apiRouter.get('/', (_req, res) => {
  const stats = getStats();

  res.json({
    success: true,
    data: {
      name: 'Memory Shack API',
      version: '0.1.0',
      description: 'Personal memory augmentation system - HTTP API',
      endpoints: {
        timeline: '/api/timeline',
        entities: '/api/entities',
        memory: '/api/memory',
        insights: '/api/insights',
        categories: '/api/categories',
        stats: '/api/stats',
      },
      stats: {
        events: stats.eventCount,
        memories: stats.memoryCount,
        entities: stats.entityCount,
        relations: stats.relationCount,
      },
      database: {
        path: stats.dbPath,
        size_bytes: stats.dbSize,
        journal_mode: stats.journalMode,
      },
    },
  });
});

// Categories endpoint - Get all event types with metadata
apiRouter.get('/categories', (_req, res) => {
  try {
    const db = getDB();

    // Get distinct event types with counts
    const types = db.prepare(`
      SELECT
        type,
        COUNT(*) as count
      FROM timeline_events
      GROUP BY type
      ORDER BY count DESC
    `).all() as Array<{ type: string; count: number }>;

    // Map types to friendly labels and colors
    const categoryMapping: Record<string, { label: string; color: string }> = {
      jira_ticket: { label: 'Work', color: '#3b82f6' },
      spotify_play: { label: 'Music', color: '#10b981' },
      calendar_event: { label: 'Calendar', color: '#8b5cf6' },
      journal_entry: { label: 'Journal', color: '#ec4899' },
    };

    const categories = types.map(({ type, count }) => {
      const mapping = categoryMapping[type] || {
        label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: '#6b7280'
      };

      return {
        type,
        label: mapping.label,
        count,
        color: mapping.color,
      };
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
    });
  }
});

// Stats endpoint - Get summary statistics for a date range
apiRouter.get('/stats', (req, res): void => {
  try {
    const { start, end } = req.query;

    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both start and end date parameters are required (YYYY-MM-DD)',
        },
      });
      return;
    }

    const db = getDB();

    // Get total events in range
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM timeline_events
      WHERE date BETWEEN ? AND ?
    `).get(start, end) as { total: number };

    // Get events by type
    const byTypeResults = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM timeline_events
      WHERE date BETWEEN ? AND ?
      GROUP BY type
      ORDER BY count DESC
    `).all(start, end) as Array<{ type: string; count: number }>;

    const eventsByType: Record<string, number> = {};
    byTypeResults.forEach(({ type, count }) => {
      eventsByType[type] = count;
    });

    // Get top days by event count
    const topDaysResults = db.prepare(`
      SELECT date, COUNT(*) as count
      FROM timeline_events
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY count DESC
      LIMIT 10
    `).all(start, end) as Array<{ date: string; count: number }>;

    res.json({
      success: true,
      data: {
        dateRange: { start, end },
        totalEvents: totalResult.total,
        eventsByType,
        topDays: topDaysResults,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
    });
  }
});
