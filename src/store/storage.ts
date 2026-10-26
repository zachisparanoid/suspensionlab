/**
 * localStorage wrapper that degrades to in-memory when storage is
 * unavailable/full (private mode, quota). One-time flag lets the UI toast.
 */

const memory = new Map<string, string>();
let storageBroken = false;
let warned = false;

export const KEYS = {
  savedConfigs: 'suspensionlab.savedConfigs',
  lastConfig: 'suspensionlab.lastConfig',
  units: 'suspensionlab.units',
  theme: 'suspensionlab.theme',
  lessonProgress: 'suspensionlab.lessonProgress',
} as const;

export function storageGet(key: string): string | null {
  if (storageBroken) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    storageBroken = true;
    return memory.get(key) ?? null;
  }
}

export function storageSet(key: string, value: string): void {
  memory.set(key, value);
  if (storageBroken) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    storageBroken = true;
  }
}

export function storageRemove(key: string): void {
  memory.delete(key);
  if (storageBroken) return;
  try {
    localStorage.removeItem(key);
  } catch {
    storageBroken = true;
  }
}

/** True exactly once, the first time storage is found broken (for a toast). */
export function shouldWarnStorage(): boolean {
  if (storageBroken && !warned) {
    warned = true;
    return true;
  }
  return false;
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = storageGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storageSet(key, JSON.stringify(value));
  } catch {
    /* serialization failure — drop silently, never crash the app */
  }
}
