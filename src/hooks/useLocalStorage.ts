/**
 * Generic persisted-state hook over the safe storage wrapper.
 * (Most app persistence goes through the stores; this exists for small
 * UI preferences owned by individual components.)
 */
import { useCallback, useState } from 'react';
import { readJson, writeJson } from '../store/storage';

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJson(key, initial));

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        writeJson(key, next);
        return next;
      });
    },
    [key],
  );

  return [value, set];
}
