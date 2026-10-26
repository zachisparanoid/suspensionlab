/**
 * Small disk-persisted LRU cache for Claude summaries. Loads once at startup,
 * writes back with a 1s debounce. Never throws — a broken cache file just
 * means a cold cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CacheEntry } from '../types';

const MAX_ENTRIES = 200;
const WRITE_DEBOUNCE_MS = 1000;

function isCacheEntry(value: unknown): value is CacheEntry {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['summary'] === 'string' &&
    typeof candidate['tookMs'] === 'number' &&
    typeof candidate['createdAt'] === 'number'
  );
}

export class SummaryCache {
  private readonly filePath: string;
  private readonly map = new Map<string, CacheEntry>();
  private writeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(filePath: string) {
    this.filePath = filePath;

    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    } catch (err) {
      console.warn('summary cache: could not create cache directory:', err);
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (isCacheEntry(value)) {
            this.map.set(key, value);
          }
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        console.warn('summary cache: could not load cache file, starting fresh:', err);
      }
    }
  }

  get(hash: string): CacheEntry | undefined {
    const entry = this.map.get(hash);
    if (entry === undefined) return undefined;
    // Refresh recency: Map iteration order is insertion order.
    this.map.delete(hash);
    this.map.set(hash, entry);
    return entry;
  }

  set(hash: string, entry: CacheEntry): void {
    this.map.delete(hash);
    this.map.set(hash, entry);
    if (this.map.size > MAX_ENTRIES) {
      const oldest = this.map.keys().next();
      if (!oldest.done) {
        this.map.delete(oldest.value);
      }
    }
    this.scheduleWrite();
  }

  private scheduleWrite(): void {
    if (this.writeTimer !== undefined) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      this.writeTimer = undefined;
      const snapshot = JSON.stringify(Object.fromEntries(this.map), null, 2);
      fs.promises
        .writeFile(this.filePath, snapshot, 'utf8')
        .catch((err: unknown) => console.warn('summary cache: write failed:', err));
    }, WRITE_DEBOUNCE_MS);
  }
}
