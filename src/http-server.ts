#!/usr/bin/env node
/**
 * Memory Shack HTTP API Server
 * RESTful API for timeline events, entities, and memories
 */

import express, { Request, Response, NextFunction } from 'express';
import type { Express } from 'express';
import cors from 'cors';
import { initDB, healthCheck } from './storage/db.js';
import { apiRouter } from './api/routes.js';

const PORT = process.env.MEMORY_HTTP_PORT || 3002;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5180', // Dashboard
  'http://localhost:5179', // Quantified Life
  'http://localhost:5173', // Google Calendar Clone
  'http://localhost:5174', // JIRA Wrapper
  'http://localhost:5175', // Last.fm Clone
  'http://localhost:5176', // LiveJournal Clone
  'http://localhost:5177', // React TS Templates
  'http://localhost:5178', // Task Manager
];

const app: Express = express();

// CORS middleware with origin validation
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parsing
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const health = healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: {
      status: health.status,
      checks: health.checks,
      error: health.error,
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use('/api', apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Handle CORS errors
  if (err.message.includes('not allowed by CORS')) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle not found errors
  if (err.name === 'NotFoundError') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
    });
    return;
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
});

// Initialize database
try {
  initDB();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`Memory Shack HTTP API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints: http://localhost:${PORT}/api/*`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
