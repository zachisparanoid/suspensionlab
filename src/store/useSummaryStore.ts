/**
 * AI summary state. The debounce/trigger logic lives in
 * hooks/useDebouncedSummary; this store owns the request lifecycle,
 * abort handling, and the offline fallback.
 */
import { create } from 'zustand';
import type { SummaryRequest, SummaryResponse } from '@shared/contract';
import { SUMMARY_ENDPOINT } from '@shared/contract';
import type { SummaryFocus } from '../types';
import { describeSetup } from '../physics/describe';
import { toSummaryDerived } from '../physics/derive';
import { useConfigStore } from './useConfigStore';

interface SummaryState {
  text: string;
  loading: boolean;
  /** True when showing the rule-based fallback instead of Claude. */
  offline: boolean;
  /** Server said this came from cache. */
  cached: boolean;
  error: string | null;
  promptUsed: string;
  tookMs: number;
  focus: SummaryFocus;
  inspectorOpen: boolean;

  setFocus: (f: SummaryFocus) => void;
  setInspectorOpen: (open: boolean) => void;
  /** Fire a summary request for the CURRENT store state, cancelling stale ones. */
  request: () => Promise<void>;
}

let controller: AbortController | null = null;

export const useSummaryStore = create<SummaryState>((set, get) => ({
  text: '',
  loading: false,
  offline: false,
  cached: false,
  error: null,
  promptUsed: '',
  tookMs: 0,
  focus: 'overview',
  inspectorOpen: false,

  setFocus: (f) => set({ focus: f }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  request: async () => {
    const cfg = useConfigStore.getState();
    const { params, derived, snapshotA, units, presetId } = cfg;
    const focus = get().focus;

    controller?.abort();
    const mine = new AbortController();
    controller = mine;
    set({ loading: true, error: null });

    const body: SummaryRequest = {
      params,
      derived: toSummaryDerived(derived),
      presetName: presetId ?? undefined,
      units,
      focus,
      compare: snapshotA
        ? { params: snapshotA.params, derived: toSummaryDerived(snapshotA.derived) }
        : undefined,
    };

    try {
      const res = await fetch(SUMMARY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: mine.signal,
      });

      if (mine.signal.aborted) return;

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
        // Claude missing or timing out → graceful offline fallback.
        set({
          loading: false,
          offline: true,
          cached: false,
          text: describeSetup(params, derived, focus),
          promptUsed: '',
          error: err.code === 'CLAUDE_NOT_FOUND' ? null : (err.error ?? 'summary failed'),
          tookMs: 0,
        });
        return;
      }

      const data = (await res.json()) as SummaryResponse;
      if (mine.signal.aborted) return;
      set({
        loading: false,
        offline: false,
        cached: data.cached,
        text: data.summary,
        promptUsed: data.promptUsed,
        tookMs: data.tookMs,
        error: null,
      });
    } catch (e) {
      if (mine.signal.aborted) return;
      // Network failure (server down) → offline fallback, app stays usable.
      set({
        loading: false,
        offline: true,
        cached: false,
        text: describeSetup(params, derived, focus),
        promptUsed: '',
        tookMs: 0,
        error: e instanceof Error && e.name !== 'AbortError' ? null : null,
      });
    }
  },
}));
