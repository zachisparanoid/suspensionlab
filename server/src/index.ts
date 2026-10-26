/**
 * SuspensionLab Express server. Serves the summary API in dev (behind the
 * Vite proxy) and the built client + API in production.
 */
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HealthResponse, SummaryError } from '../../shared/contract';
import { SummaryCache } from './cache/summaryCache';
import { checkClaudeAvailable } from './claude/runClaudeCode';
import { createSummaryRouter } from './routes/summary';

const HERE = fileURLToPath(import.meta.url); // .../server/src/index.ts
const CACHE_FILE = path.resolve(HERE, '../../data/summary-cache.json'); // server/data/
const DIST_DIR = path.resolve(HERE, '../../../dist'); // repo root /dist

const app = express();
app.use(express.json({ limit: '1mb' }));

// Tiny request logger for API traffic.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
  }
  next();
});

app.use('/api/summary', createSummaryRouter(new SummaryCache(CACHE_FILE)));

app.get('/api/health', async (_req: Request, res: Response) => {
  const claudeAvailable = await checkClaudeAvailable();
  res.json({ ok: true, claudeAvailable, version: '1.0.0' } satisfies HealthResponse);
});

// In production, serve the built client and fall back to index.html for
// client-side routes.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    } else {
      next();
    }
  });
}

// Global error handler (bad JSON bodies, anything a route let escape).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('server error:', err instanceof Error ? err.message : String(err));
  res
    .status(500)
    .json({ error: 'internal server error', code: 'CLAUDE_ERROR' } satisfies SummaryError);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, '0.0.0.0', () => {
  const urls = [`http://localhost:${port}`];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        urls.push(`http://${info.address}:${port}`);
      }
    }
  }
  console.log('SuspensionLab server listening on:');
  for (const url of urls) {
    console.log(`  ${url}`);
  }
});
