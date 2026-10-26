/**
 * Watches param changes and (900 ms after the last one) asks the server for a
 * fresh AI summary. In-flight requests are aborted by the store when a newer
 * one fires, so only the latest setup is ever summarized.
 */
import { useEffect, useRef } from 'react';
import { useConfigStore } from '../store/useConfigStore';
import { useSummaryStore } from '../store/useSummaryStore';

export const SUMMARY_DEBOUNCE_MS = 900;

export function useDebouncedSummary(): void {
  const paramsVersion = useConfigStore((s) => s.paramsVersion);
  const focus = useSummaryStore((s) => s.focus);
  const snapshotId = useConfigStore((s) => s.snapshotA?.id ?? null);
  const request = useSummaryStore((s) => s.request);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void request(), SUMMARY_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [paramsVersion, focus, snapshotId, request]);
}
