/**
 * Layout preferences: focus mode + pinned items.
 *
 * Focus mode declutters the dashboard: parameter groups collapse, only pinned
 * stats/panels stay visible. Pins are the user's "my instruments" selection
 * and survive the toggle — that's the whole point. Everything persists.
 */
import { create } from 'zustand';
import type { ParamKey } from '../types';
import { readJson, writeJson } from './storage';

const UI_KEY = 'suspensionlab.ui';

/** Pinnable center-column panels. The vehicle diagram is always visible. */
export type PanelId = 'quarter' | 'step' | 'trans' | 'loads';

/** Shown in focus mode when the user hasn't pinned any stats yet. */
export const DEFAULT_FOCUS_STATS: string[] = [
  'rideFrequencyFront',
  'rideFrequencyRear',
  'dampingRatioFront',
  'dampingRatioRear',
  'rollGradient',
  'balanceIndex',
  'comfortIndex',
  'sportIndex',
];

interface PersistedUi {
  focusMode: boolean;
  pinnedStats: string[];
  pinnedParams: ParamKey[];
  pinnedPanels: PanelId[];
  aiPinned: boolean;
}

interface UiState extends PersistedUi {
  toggleFocus: () => void;
  togglePinStat: (key: string) => void;
  togglePinParam: (key: ParamKey) => void;
  togglePinPanel: (id: PanelId) => void;
  toggleAiPinned: () => void;
}

const DEFAULTS: PersistedUi = {
  focusMode: false,
  pinnedStats: [],
  pinnedParams: [],
  pinnedPanels: ['quarter', 'step'],
  aiPinned: false,
};

const stored = readJson<Partial<PersistedUi>>(UI_KEY, {});
const initial: PersistedUi = {
  focusMode: typeof stored.focusMode === 'boolean' ? stored.focusMode : DEFAULTS.focusMode,
  pinnedStats: Array.isArray(stored.pinnedStats) ? stored.pinnedStats : DEFAULTS.pinnedStats,
  pinnedParams: Array.isArray(stored.pinnedParams)
    ? (stored.pinnedParams as ParamKey[])
    : DEFAULTS.pinnedParams,
  pinnedPanels: Array.isArray(stored.pinnedPanels)
    ? (stored.pinnedPanels.filter((p) =>
        ['quarter', 'step', 'trans', 'loads'].includes(p as string),
      ) as PanelId[])
    : DEFAULTS.pinnedPanels,
  aiPinned: typeof stored.aiPinned === 'boolean' ? stored.aiPinned : DEFAULTS.aiPinned,
};

const toggleIn = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export const useUiStore = create<UiState>((set, get) => {
  const persist = () => {
    const { focusMode, pinnedStats, pinnedParams, pinnedPanels, aiPinned } = get();
    writeJson(UI_KEY, { focusMode, pinnedStats, pinnedParams, pinnedPanels, aiPinned });
  };

  return {
    ...initial,

    toggleFocus: () => {
      set({ focusMode: !get().focusMode });
      persist();
    },
    togglePinStat: (key) => {
      set({ pinnedStats: toggleIn(get().pinnedStats, key) });
      persist();
    },
    togglePinParam: (key) => {
      set({ pinnedParams: toggleIn(get().pinnedParams, key) });
      persist();
    },
    togglePinPanel: (id) => {
      set({ pinnedPanels: toggleIn(get().pinnedPanels, id) });
      persist();
    },
    toggleAiPinned: () => {
      set({ aiPinned: !get().aiPinned });
      persist();
    },
  };
});

/** Reusable pin-toggle for panel headers and cards. */
export const isPanelVisible = (
  id: PanelId,
  focusMode: boolean,
  pinnedPanels: PanelId[],
): boolean => !focusMode || pinnedPanels.includes(id);
