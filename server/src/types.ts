/**
 * Internal server-side types. The wire contract lives in shared/contract.ts;
 * everything here is implementation detail of the Express server.
 */
import type { SummaryErrorCode } from '../../shared/contract';

/** One cached Claude summary, persisted to disk between runs. */
export interface CacheEntry {
  summary: string;
  tookMs: number;
  createdAt: number;
}

/** Typed error carrying a wire-level error code for the summary endpoint. */
export class ClaudeError extends Error {
  readonly code: SummaryErrorCode;

  constructor(message: string, code: SummaryErrorCode) {
    super(message);
    this.name = 'ClaudeError';
    this.code = code;
  }
}
