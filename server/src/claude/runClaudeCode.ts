/**
 * Thin wrapper around the local Claude Code CLI (`claude -p`). No API keys —
 * this rides on whatever auth the machine's Claude Code install already has.
 */
import { spawn } from 'node:child_process';
import { ClaudeError } from '../types';

/**
 * Default CLI timeout. Measured warm latency for a summary-sized prompt on a
 * typical machine is 15–40 s, so the spec's original 20 s fired on most real
 * requests; 60 s keeps the safety net without starving legitimate replies.
 * Override with CLAUDE_TIMEOUT_MS.
 */
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS ?? 60000);

/**
 * Simple semaphore so aborted-but-still-running CLI children can't pile up:
 * at most 2 concurrent `claude` processes; further requests wait their turn.
 */
const MAX_CONCURRENT = 2;
let running = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++;
    return;
  }
  await new Promise<void>((res) => waiters.push(res));
  running++;
}

function release(): void {
  running--;
  const next = waiters.shift();
  if (next) next();
}

/**
 * Run a prompt through `claude -p --output-format text` and resolve with the
 * trimmed stdout. Rejects with a typed ClaudeError on timeout, missing CLI,
 * nonzero exit, or empty output.
 */
export async function runClaude(prompt: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  await acquire();
  try {
    return await runClaudeUnguarded(prompt, timeoutMs);
  } finally {
    release();
  }
}

function runClaudeUnguarded(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt, '--output-format', 'text'], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const succeed = (value: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const fail = (error: ClaudeError): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      fail(new ClaudeError(`Claude Code timed out after ${Math.round(timeoutMs / 1000)}s`, 'TIMEOUT'));
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        fail(new ClaudeError('Claude Code CLI not found on this machine', 'CLAUDE_NOT_FOUND'));
      } else {
        fail(new ClaudeError(`failed to launch Claude Code: ${err.message}`, 'CLAUDE_ERROR'));
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        fail(
          new ClaudeError(
            `Claude Code exited with code ${String(code)}: ${stderr.slice(0, 200)}`,
            'CLAUDE_ERROR',
          ),
        );
        return;
      }
      const out = stdout.trim();
      if (out.length === 0) {
        fail(new ClaudeError('Claude Code produced no output', 'CLAUDE_ERROR'));
        return;
      }
      succeed(out);
    });
  });
}

const AVAILABILITY_TTL_MS = 60000;
let availabilityCache: { value: boolean; checkedAt: number } | null = null;

function probeClaude(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn('claude', ['--version'], {
      env: process.env,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    let settled = false;
    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(false);
    }, 3000);

    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}

/** True if the `claude` CLI answers `--version` within 3s. Memoized for 60s. */
export async function checkClaudeAvailable(): Promise<boolean> {
  const now = Date.now();
  if (availabilityCache !== null && now - availabilityCache.checkedAt < AVAILABILITY_TTL_MS) {
    return availabilityCache.value;
  }
  const value = await probeClaude();
  availabilityCache = { value, checkedAt: Date.now() };
  return value;
}
