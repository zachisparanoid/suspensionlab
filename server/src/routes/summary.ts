/**
 * POST /api/summary — validate, hash, serve from cache or run Claude Code.
 * Identical concurrent requests share a single in-flight Claude run.
 */
import { Router } from 'express';
import { ZodError } from 'zod';
import type {
  SummaryError,
  SummaryErrorCode,
  SummaryRequest,
  SummaryResponse,
} from '../../../shared/contract';
import type { SummaryCache } from '../cache/summaryCache';
import { buildPrompt, hashRequest } from '../claude/promptBuilder';
import { runClaude } from '../claude/runClaudeCode';
import { ClaudeError } from '../types';
import { parseSummaryRequest } from '../validation/schema';

const STATUS_BY_CODE: Record<SummaryErrorCode, number> = {
  CLAUDE_NOT_FOUND: 503,
  TIMEOUT: 504,
  CLAUDE_ERROR: 502,
  BAD_REQUEST: 400,
};

interface RunResult {
  summary: string;
  tookMs: number;
}

/** Dedup map: request hash -> in-flight Claude run shared by identical requests. */
const inFlight = new Map<string, Promise<RunResult>>();

export function createSummaryRouter(cache: SummaryCache): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    let parsed: SummaryRequest;
    try {
      parsed = parseSummaryRequest(req.body);
    } catch (err) {
      const firstIssue = err instanceof ZodError ? err.issues[0] : undefined;
      const message =
        firstIssue !== undefined
          ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
          : 'invalid request body';
      res.status(400).json({ error: message, code: 'BAD_REQUEST' } satisfies SummaryError);
      return;
    }

    const hash = hashRequest(parsed);
    const prompt = buildPrompt(parsed);

    const cached = cache.get(hash);
    if (cached !== undefined) {
      res.json({
        summary: cached.summary,
        cached: true,
        promptUsed: prompt,
        model: 'claude-code-local',
        tookMs: cached.tookMs,
      } satisfies SummaryResponse);
      return;
    }

    try {
      let pending = inFlight.get(hash);
      if (pending === undefined) {
        const t0 = Date.now();
        pending = runClaude(prompt)
          .then((summary): RunResult => ({ summary, tookMs: Date.now() - t0 }))
          .finally(() => inFlight.delete(hash));
        inFlight.set(hash, pending);
      }
      const result = await pending;

      cache.set(hash, {
        summary: result.summary,
        tookMs: result.tookMs,
        createdAt: Date.now(),
      });
      res.json({
        summary: result.summary,
        cached: false,
        promptUsed: prompt,
        model: 'claude-code-local',
        tookMs: result.tookMs,
      } satisfies SummaryResponse);
    } catch (err) {
      if (err instanceof ClaudeError) {
        res
          .status(STATUS_BY_CODE[err.code])
          .json({ error: err.message, code: err.code } satisfies SummaryError);
        return;
      }
      console.error('summary route: unexpected error:', err);
      res
        .status(502)
        .json({ error: 'unexpected error while generating summary', code: 'CLAUDE_ERROR' } satisfies SummaryError);
    }
  });

  return router;
}
