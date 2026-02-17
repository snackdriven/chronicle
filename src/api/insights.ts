/**
 * Insights API Routes
 * Provides analytics and insights for JIRA work patterns
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { getDB } from '../storage/db.js';

export const insightsRouter: ExpressRouter = Router();

// Zod schemas for validation
const DateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const PeriodSchema = z.enum(['week', 'month', 'day']);

/**
 * GET /api/insights/work-patterns?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Analyze work patterns over a date range
 */
insightsRouter.get('/work-patterns', (req: Request, res: Response): void => {
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

    // Validate date formats
    try {
      DateParamSchema.parse(start);
      DateParamSchema.parse(end);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dates must be in YYYY-MM-DD format',
        },
      });
      return;
    }

    const db = getDB();

    // Get tickets per day in the range
    const ticketsPerDay = db.prepare(`
      SELECT
        date,
        COUNT(*) as count
      FROM timeline_events
      WHERE type = 'jira_ticket'
        AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC
    `).all(start, end) as Array<{ date: string; count: number }>;

    // Calculate statistics
    const totalTickets = ticketsPerDay.reduce((sum, day) => sum + day.count, 0);
    const daysWithTickets = ticketsPerDay.length;
    const avgPerDay = daysWithTickets > 0 ? totalTickets / daysWithTickets : 0;

    // Calculate total days in range (for days without tickets)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Find busiest days (top 10)
    const busiestDays = [...ticketsPerDay]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate weekly average
    const weeksDiff = daysDiff / 7;
    const avgPerWeek = weeksDiff > 0 ? totalTickets / weeksDiff : 0;

    res.json({
      success: true,
      data: {
        dateRange: { start, end },
        totalTickets,
        daysInRange: daysDiff,
        daysWithTickets,
        avgPerDay: Math.round(avgPerDay * 100) / 100,
        avgPerWeek: Math.round(avgPerWeek * 100) / 100,
        ticketsPerDay,
        busiestDays,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch work patterns',
      },
    });
  }
});

/**
 * GET /api/insights/project-distribution
 * Get ticket distribution across projects
 */
insightsRouter.get('/project-distribution', (_req: Request, res: Response): void => {
  try {
    const db = getDB();

    // Get total ticket count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM timeline_events
      WHERE type = 'jira_ticket'
    `).get() as { total: number };

    const totalTickets = totalResult.total;

    // Get tickets per project
    const projectData = db.prepare(`
      SELECT
        json_extract(metadata, '$.project') as project,
        COUNT(*) as count
      FROM timeline_events
      WHERE type = 'jira_ticket'
      GROUP BY project
      ORDER BY count DESC
    `).all() as Array<{ project: string; count: number }>;

    // Calculate percentages
    const projects = projectData.map(p => ({
      project: p.project,
      count: p.count,
      percentage: Math.round((p.count / totalTickets) * 10000) / 100,
    }));

    res.json({
      success: true,
      data: {
        totalTickets,
        projectCount: projects.length,
        projects,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch project distribution',
      },
    });
  }
});

/**
 * GET /api/insights/velocity?period=week|month|day
 * Get ticket completion velocity over time
 */
insightsRouter.get('/velocity', (req: Request, res: Response): void => {
  try {
    const period = (req.query.period as string) || 'week';

    // Validate period
    try {
      PeriodSchema.parse(period);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Period must be one of: week, month, day',
        },
      });
      return;
    }

    const db = getDB();

    // Get date format based on period
    let dateFormat: string;
    let groupLabel: string;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupLabel = 'date';
        break;
      case 'week':
        // SQLite week format: YYYY-WW
        dateFormat = '%Y-W%W';
        groupLabel = 'week';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupLabel = 'month';
        break;
      default:
        dateFormat = '%Y-W%W';
        groupLabel = 'week';
    }

    // Get completion velocity (only Done tickets)
    const velocityData = db.prepare(`
      SELECT
        strftime('${dateFormat}', date) as period,
        COUNT(*) as completed
      FROM timeline_events
      WHERE type = 'jira_ticket'
        AND json_extract(metadata, '$.status') = 'Done'
      GROUP BY period
      ORDER BY period ASC
    `).all() as Array<{ period: string; completed: number }>;

    // Get all tickets (for comparison)
    const allTicketsData = db.prepare(`
      SELECT
        strftime('${dateFormat}', date) as period,
        COUNT(*) as total
      FROM timeline_events
      WHERE type = 'jira_ticket'
      GROUP BY period
      ORDER BY period ASC
    `).all() as Array<{ period: string; total: number }>;

    // Merge data
    const velocityMap = new Map(velocityData.map(v => [v.period, v.completed]));
    const allTicketsMap = new Map(allTicketsData.map(v => [v.period, v.total]));

    const combinedData = Array.from(new Set([...velocityMap.keys(), ...allTicketsMap.keys()]))
      .sort()
      .map(period => ({
        period,
        completed: velocityMap.get(period) || 0,
        total: allTicketsMap.get(period) || 0,
        completionRate: allTicketsMap.get(period)
          ? Math.round(((velocityMap.get(period) || 0) / allTicketsMap.get(period)!) * 10000) / 100
          : 0,
      }));

    // Calculate average velocity
    const avgCompleted = velocityData.length > 0
      ? Math.round((velocityData.reduce((sum, v) => sum + v.completed, 0) / velocityData.length) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        period,
        groupLabel,
        avgCompletedPerPeriod: avgCompleted,
        velocity: combinedData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch velocity data',
      },
    });
  }
});

/**
 * GET /api/insights/components
 * Get top components by ticket count
 */
insightsRouter.get('/components', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const db = getDB();

    // Get tickets per component
    const componentData = db.prepare(`
      SELECT
        json_extract(metadata, '$.component') as component,
        COUNT(*) as count
      FROM timeline_events
      WHERE type = 'jira_ticket'
        AND json_extract(metadata, '$.component') IS NOT NULL
        AND json_extract(metadata, '$.component') != ''
      GROUP BY component
      ORDER BY count DESC
      LIMIT ?
    `).all(limit) as Array<{ component: string; count: number }>;

    // Get total tickets with components
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM timeline_events
      WHERE type = 'jira_ticket'
        AND json_extract(metadata, '$.component') IS NOT NULL
        AND json_extract(metadata, '$.component') != ''
    `).get() as { total: number };

    const totalWithComponents = totalResult.total;

    // Calculate percentages
    const components = componentData.map(c => ({
      component: c.component,
      count: c.count,
      percentage: Math.round((c.count / totalWithComponents) * 10000) / 100,
    }));

    res.json({
      success: true,
      data: {
        totalTicketsWithComponents: totalWithComponents,
        componentCount: componentData.length,
        components,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch component data',
      },
    });
  }
});

/**
 * GET /api/insights/labels
 * Get most common labels with counts
 */
insightsRouter.get('/labels', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const db = getDB();

    // Get all tickets with labels
    const ticketsWithLabels = db.prepare(`
      SELECT json_extract(metadata, '$.labels') as labels_json
      FROM timeline_events
      WHERE type = 'jira_ticket'
        AND json_extract(metadata, '$.labels') IS NOT NULL
    `).all() as Array<{ labels_json: string }>;

    // Count label occurrences
    const labelCounts = new Map<string, number>();
    let totalLabels = 0;

    ticketsWithLabels.forEach(row => {
      try {
        const labels = JSON.parse(row.labels_json) as string[];
        if (Array.isArray(labels)) {
          labels.forEach(label => {
            if (label && typeof label === 'string') {
              labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
              totalLabels++;
            }
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Sort by count and take top N
    const topLabels = Array.from(labelCounts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalLabels > 0 ? Math.round((count / totalLabels) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        totalLabels,
        uniqueLabels: labelCounts.size,
        ticketsWithLabels: ticketsWithLabels.length,
        labels: topLabels,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch label data',
      },
    });
  }
});

/**
 * GET /api/insights/status-distribution
 * Get ticket distribution by status
 */
insightsRouter.get('/status-distribution', (_req: Request, res: Response): void => {
  try {
    const db = getDB();

    // Get total ticket count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM timeline_events
      WHERE type = 'jira_ticket'
    `).get() as { total: number };

    const totalTickets = totalResult.total;

    // Get tickets per status
    const statusData = db.prepare(`
      SELECT
        json_extract(metadata, '$.status') as status,
        COUNT(*) as count
      FROM timeline_events
      WHERE type = 'jira_ticket'
      GROUP BY status
      ORDER BY count DESC
    `).all() as Array<{ status: string; count: number }>;

    // Calculate percentages
    const statuses = statusData.map(s => ({
      status: s.status,
      count: s.count,
      percentage: Math.round((s.count / totalTickets) * 10000) / 100,
    }));

    res.json({
      success: true,
      data: {
        totalTickets,
        statusCount: statuses.length,
        statuses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch status distribution',
      },
    });
  }
});

/**
 * GET /api/insights/top-artists?limit=20&start=YYYY-MM-DD&end=YYYY-MM-DD
 * Get top artists by play count with optional date filtering
 */
insightsRouter.get('/top-artists', (req: Request, res: Response): void => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const { start, end } = req.query;

    const db = getDB();

    // Build query with optional date filtering
    let query = `
      SELECT
        json_extract(metadata, '$.artist_name') as artist,
        COUNT(*) as play_count,
        ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as total_duration_hours,
        COUNT(DISTINCT json_extract(metadata, '$.album_name')) as album_count,
        MIN(date) as first_played,
        MAX(date) as last_played
      FROM timeline_events
      WHERE type = 'spotify_play'
    `;

    const params: any[] = [];

    if (start && end && typeof start === 'string' && typeof end === 'string') {
      try {
        DateParamSchema.parse(start);
        DateParamSchema.parse(end);
        query += ` AND date BETWEEN ? AND ?`;
        params.push(start, end);
      } catch (e) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dates must be in YYYY-MM-DD format',
          },
        });
        return;
      }
    }

    query += `
      GROUP BY artist
      ORDER BY play_count DESC
      LIMIT ?
    `;
    params.push(limit);

    const artists = db.prepare(query).all(...params) as Array<{
      artist: string;
      play_count: number;
      total_duration_hours: number;
      album_count: number;
      first_played: string;
      last_played: string;
    }>;

    res.json({
      success: true,
      data: {
        dateRange: start && end ? { start, end } : null,
        artists,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch top artists',
      },
    });
  }
});

/**
 * GET /api/insights/listening-patterns?period=day|week|month
 * Get listening patterns over time
 */
insightsRouter.get('/listening-patterns', (req: Request, res: Response): void => {
  try {
    const period = (req.query.period as string) || 'month';

    // Validate period
    try {
      z.enum(['day', 'week', 'month']).parse(period);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Period must be one of: day, week, month',
        },
      });
      return;
    }

    const db = getDB();

    // Get date format based on period
    let dateFormat: string;
    let groupLabel: string;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupLabel = 'date';
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        groupLabel = 'week';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupLabel = 'month';
        break;
      default:
        dateFormat = '%Y-%m';
        groupLabel = 'month';
    }

    // Get listening patterns
    const patterns = db.prepare(`
      SELECT
        strftime('${dateFormat}', date) as period,
        COUNT(*) as plays,
        ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours,
        COUNT(DISTINCT json_extract(metadata, '$.artist_name')) as unique_artists
      FROM timeline_events
      WHERE type = 'spotify_play'
      GROUP BY period
      ORDER BY period ASC
    `).all() as Array<{
      period: string;
      plays: number;
      hours: number;
      unique_artists: number;
    }>;

    // Get top artist per period
    const patternsWithTopArtist = patterns.map(p => {
      const topArtist = db.prepare(`
        SELECT
          json_extract(metadata, '$.artist_name') as artist,
          COUNT(*) as plays
        FROM timeline_events
        WHERE type = 'spotify_play'
          AND strftime('${dateFormat}', date) = ?
        GROUP BY artist
        ORDER BY plays DESC
        LIMIT 1
      `).get(p.period) as { artist: string; plays: number } | undefined;

      return {
        ...p,
        top_artist: topArtist?.artist || null,
        top_artist_plays: topArtist?.plays || 0,
      };
    });

    res.json({
      success: true,
      data: {
        period,
        groupLabel,
        patterns: patternsWithTopArtist,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch listening patterns',
      },
    });
  }
});

/**
 * GET /api/insights/music-work-correlation?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Correlate music listening with work activity (JIRA tickets)
 */
insightsRouter.get('/music-work-correlation', (req: Request, res: Response): void => {
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

    // Validate date formats
    try {
      DateParamSchema.parse(start);
      DateParamSchema.parse(end);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dates must be in YYYY-MM-DD format',
        },
      });
      return;
    }

    const db = getDB();

    // Get daily stats for both music and work
    const dailyStats = db.prepare(`
      WITH music_stats AS (
        SELECT
          date,
          COUNT(*) as music_plays,
          ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as music_hours
        FROM timeline_events
        WHERE type = 'spotify_play'
          AND date BETWEEN ? AND ?
        GROUP BY date
      ),
      work_stats AS (
        SELECT
          date,
          COUNT(*) as tickets
        FROM timeline_events
        WHERE type = 'jira_ticket'
          AND date BETWEEN ? AND ?
        GROUP BY date
      ),
      all_dates AS (
        SELECT date FROM music_stats
        UNION
        SELECT date FROM work_stats
      )
      SELECT
        d.date,
        COALESCE(m.music_plays, 0) as music_plays,
        COALESCE(m.music_hours, 0) as music_hours,
        COALESCE(w.tickets, 0) as tickets
      FROM all_dates d
      LEFT JOIN music_stats m ON d.date = m.date
      LEFT JOIN work_stats w ON d.date = w.date
      ORDER BY d.date ASC
    `).all(start, end, start, end) as Array<{
      date: string;
      music_plays: number;
      music_hours: number;
      tickets: number;
    }>;

    // Calculate correlation statistics
    const busyWorkDays = dailyStats.filter(d => d.tickets >= 3); // 3+ tickets = busy day
    const normalDays = dailyStats.filter(d => d.tickets > 0 && d.tickets < 3);
    const nonWorkDays = dailyStats.filter(d => d.tickets === 0);

    const calculateAvg = (days: typeof dailyStats, field: 'music_hours' | 'music_plays') => {
      if (days.length === 0) return 0;
      const sum = days.reduce((s, d) => s + d[field], 0);
      return Math.round((sum / days.length) * 100) / 100;
    };

    const getTopArtist = (days: typeof dailyStats) => {
      if (days.length === 0) return null;

      const dates = days.map(d => d.date);
      if (dates.length === 0) return null;

      const placeholders = dates.map(() => '?').join(',');
      const topArtist = db.prepare(`
        SELECT
          json_extract(metadata, '$.artist_name') as artist,
          COUNT(*) as plays
        FROM timeline_events
        WHERE type = 'spotify_play'
          AND date IN (${placeholders})
        GROUP BY artist
        ORDER BY plays DESC
        LIMIT 1
      `).get(...dates) as { artist: string; plays: number } | undefined;

      return topArtist?.artist || null;
    };

    res.json({
      success: true,
      data: {
        dateRange: { start, end },
        correlation: {
          busy_work_days: {
            count: busyWorkDays.length,
            avg_music_hours: calculateAvg(busyWorkDays, 'music_hours'),
            avg_music_plays: calculateAvg(busyWorkDays, 'music_plays'),
            top_artist: getTopArtist(busyWorkDays),
          },
          normal_work_days: {
            count: normalDays.length,
            avg_music_hours: calculateAvg(normalDays, 'music_hours'),
            avg_music_plays: calculateAvg(normalDays, 'music_plays'),
            top_artist: getTopArtist(normalDays),
          },
          non_work_days: {
            count: nonWorkDays.length,
            avg_music_hours: calculateAvg(nonWorkDays, 'music_hours'),
            avg_music_plays: calculateAvg(nonWorkDays, 'music_plays'),
            top_artist: getTopArtist(nonWorkDays),
          },
        },
        daily_stats: dailyStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch music-work correlation',
      },
    });
  }
});

/**
 * GET /api/insights/listening-timeline?start=YYYY-MM-DD&end=YYYY-MM-DD&granularity=day|week|month
 * Get listening timeline with customizable granularity
 */
insightsRouter.get('/listening-timeline', (req: Request, res: Response): void => {
  try {
    const { start, end } = req.query;
    const granularity = (req.query.granularity as string) || 'day';

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

    // Validate dates and granularity
    try {
      DateParamSchema.parse(start);
      DateParamSchema.parse(end);
      z.enum(['day', 'week', 'month']).parse(granularity);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters. Dates must be YYYY-MM-DD, granularity must be day/week/month',
        },
      });
      return;
    }

    const db = getDB();

    // Get date format based on granularity
    let dateFormat: string;
    switch (granularity) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    // Get timeline data
    const timeline = db.prepare(`
      SELECT
        strftime('${dateFormat}', date) as period,
        COUNT(*) as plays,
        COUNT(DISTINCT json_extract(metadata, '$.artist_name')) as unique_artists,
        COUNT(DISTINCT json_extract(metadata, '$.album_name')) as unique_albums,
        ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours
      FROM timeline_events
      WHERE type = 'spotify_play'
        AND date BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period ASC
    `).all(start, end) as Array<{
      period: string;
      plays: number;
      unique_artists: number;
      unique_albums: number;
      hours: number;
    }>;

    // Calculate summary stats
    const totalPlays = timeline.reduce((sum, t) => sum + t.plays, 0);
    const totalHours = timeline.reduce((sum, t) => sum + t.hours, 0);
    const avgPlaysPerPeriod = timeline.length > 0 ? Math.round((totalPlays / timeline.length) * 100) / 100 : 0;

    res.json({
      success: true,
      data: {
        dateRange: { start, end },
        granularity,
        summary: {
          total_plays: totalPlays,
          total_hours: Math.round(totalHours * 100) / 100,
          avg_plays_per_period: avgPlaysPerPeriod,
          periods: timeline.length,
        },
        timeline,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch listening timeline',
      },
    });
  }
});
