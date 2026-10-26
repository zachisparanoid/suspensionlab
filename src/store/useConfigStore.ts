/**
 * The central store: live params, derived stats, snapshot A, presets,
 * units/theme, saved configs.
 *
 * Derived stats live HERE (not in per-component hooks) so every consumer —
 * stat cards, diagrams, lesson checkpoints — reads the same object per change.
 * Numeric stats recompute synchronously on every set (fast, ≪16 ms); chart
 * series recompute on a trailing ~66 ms throttle so slider scrubbing stays
 * smooth.
 */
import { create } from 'zustand';
import type {
  DerivedStats,
  ParamKey,
  SavedConfig,
  Snapshot,
  SuspensionParams,
  ThemeMode,
  UnitSystem,
} from '../types';
import { derive, deriveNumeric, deriveSeries } from '../physics/derive';
import { DEFAULT_PRESET_ID, getPreset, PRESETS } from '../data/presets';
import { PARAM_META } from '../data/parameterMeta';
import { KEYS, readJson, writeJson } from './storage';

const SERIES_THROTTLE_MS = 66;
const PERSIST_DEBOUNCE_MS = 400;

function clampParam(key: ParamKey, value: number): number {
  const meta = PARAM_META[key];
  if (!meta || typeof value !== 'number' || !Number.isFinite(value)) {
    return meta ? meta.min : 0;
  }
  return Math.min(Math.max(value, meta.min), meta.max);
}

/** Validate + clamp an untrusted params object against a known-good base. */
export function sanitizeParams(
  raw: Partial<SuspensionParams>,
  base: SuspensionParams,
): SuspensionParams {
  const out = { ...base };
  for (const key of Object.keys(base) as ParamKey[]) {
    const v = raw[key];
    if (key === 'roadInput') {
      if (v === 'step' || v === 'bump' || v === 'pothole' || v === 'sine') out.roadInput = v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      (out as Record<string, unknown>)[key] = clampParam(key, v);
    }
  }
  return out;
}

interface ConfigState {
  params: SuspensionParams;
  derived: DerivedStats;
  /** Baseline for per-param reset buttons (last loaded preset/config). */
  baseline: SuspensionParams;
  presetId: string | null;
  units: UnitSystem;
  theme: ThemeMode;
  snapshotA: Snapshot | null;
  savedConfigs: SavedConfig[];
  /** Pre-preset-load state for the "Undo" toast. */
  undo: { params: SuspensionParams; presetId: string | null } | null;
  /** Monotonic counter: bumps on every params change (summary debounce key). */
  paramsVersion: number;

  setParam: (key: ParamKey, value: number | string) => void;
  setParams: (partial: Partial<SuspensionParams>) => void;
  resetParam: (key: ParamKey) => void;
  loadPreset: (id: string) => void;
  undoPresetLoad: () => void;
  takeSnapshot: () => void;
  clearSnapshot: () => void;
  swapSnapshot: () => void;
  setUnits: (u: UnitSystem) => void;
  setTheme: (t: ThemeMode) => void;
  saveConfig: (name: string) => void;
  loadConfig: (id: string) => void;
  renameConfig: (id: string, name: string) => void;
  deleteConfig: (id: string) => void;
  importConfigs: (configs: SavedConfig[]) => void;
}

// ── initial state from storage ─────────────────────────────────────
const defaultPreset = getPreset(DEFAULT_PRESET_ID) ?? PRESETS[0]!;
const storedLast = readJson<Partial<SuspensionParams> | null>(KEYS.lastConfig, null);
const initialParams = storedLast
  ? sanitizeParams(storedLast, defaultPreset.params)
  : { ...defaultPreset.params };
const initialUnits = readJson<UnitSystem>(KEYS.units, 'si');
const initialTheme = readJson<ThemeMode>(KEYS.theme, 'dark');
const initialSaved = readJson<SavedConfig[]>(KEYS.savedConfigs, []);

let seriesTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useConfigStore = create<ConfigState>((set, get) => {
  /** Recompute numeric stats now; schedule the heavier series recompute. */
  const recompute = (params: SuspensionParams) => {
    const prev = get().derived;
    const numeric = deriveNumeric(params);
    set({
      derived: {
        ...prev,
        ...numeric,
      },
      paramsVersion: get().paramsVersion + 1,
    });

    if (seriesTimer) return; // trailing throttle
    seriesTimer = setTimeout(() => {
      seriesTimer = null;
      const latest = get().params;
      const series = deriveSeries(latest);
      const latestNumeric = deriveNumeric(latest);
      set({ derived: { ...latestNumeric, ...series } as DerivedStats });
    }, SERIES_THROTTLE_MS);

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => writeJson(KEYS.lastConfig, get().params), PERSIST_DEBOUNCE_MS);
  };

  const persistSaved = () => writeJson(KEYS.savedConfigs, get().savedConfigs);

  return {
    params: initialParams,
    derived: derive(initialParams),
    baseline: { ...defaultPreset.params },
    presetId: storedLast ? null : defaultPreset.id,
    units: initialUnits === 'imperial' ? 'imperial' : 'si',
    theme: initialTheme === 'light' ? 'light' : 'dark',
    snapshotA: null,
    savedConfigs: Array.isArray(initialSaved) ? initialSaved : [],
    undo: null,
    paramsVersion: 0,

    setParam: (key, value) => {
      const params = { ...get().params };
      if (key === 'roadInput') {
        if (value === 'step' || value === 'bump' || value === 'pothole' || value === 'sine') {
          params.roadInput = value;
        }
      } else if (typeof value === 'number') {
        (params as Record<string, unknown>)[key] = clampParam(key, value);
      }
      set({ params, presetId: null });
      recompute(params);
    },

    setParams: (partial) => {
      const params = sanitizeParams({ ...get().params, ...partial }, get().params);
      set({ params, presetId: null });
      recompute(params);
    },

    resetParam: (key) => {
      const { baseline } = get();
      get().setParam(key, baseline[key] as number | string);
    },

    loadPreset: (id) => {
      const preset = getPreset(id);
      if (!preset) return;
      const { params, presetId } = get();
      set({
        undo: { params, presetId },
        params: { ...preset.params },
        baseline: { ...preset.params },
        presetId: id,
      });
      recompute(preset.params);
    },

    undoPresetLoad: () => {
      const u = get().undo;
      if (!u) return;
      set({ params: u.params, presetId: u.presetId, undo: null });
      recompute(u.params);
    },

    takeSnapshot: () => {
      const { params, derived } = get();
      set({
        snapshotA: {
          id: `snap-${Date.now()}`,
          label: 'A',
          params: { ...params },
          derived: structuredClone(derived),
          takenAt: Date.now(),
        },
      });
    },

    clearSnapshot: () => set({ snapshotA: null }),

    swapSnapshot: () => {
      const { snapshotA, params, derived } = get();
      if (!snapshotA) return;
      const newSnap: Snapshot = {
        id: `snap-${Date.now()}`,
        label: 'A',
        params: { ...params },
        derived: structuredClone(derived),
        takenAt: Date.now(),
      };
      set({
        snapshotA: newSnap,
        params: { ...snapshotA.params },
        presetId: null,
      });
      recompute(snapshotA.params);
    },

    setUnits: (u) => {
      set({ units: u });
      writeJson(KEYS.units, u);
    },

    setTheme: (t) => {
      set({ theme: t });
      writeJson(KEYS.theme, t);
      document.documentElement.classList.toggle('light', t === 'light');
      document.documentElement.classList.toggle('dark', t === 'dark');
    },

    saveConfig: (name) => {
      const now = Date.now();
      const cfg: SavedConfig = {
        id: `cfg-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || 'Untitled setup',
        params: { ...get().params },
        createdAt: now,
        updatedAt: now,
      };
      set({ savedConfigs: [...get().savedConfigs, cfg] });
      persistSaved();
    },

    loadConfig: (id) => {
      const cfg = get().savedConfigs.find((c) => c.id === id);
      if (!cfg) return;
      const params = sanitizeParams(cfg.params, get().params);
      set({ params, baseline: { ...params }, presetId: null });
      recompute(params);
    },

    renameConfig: (id, name) => {
      set({
        savedConfigs: get().savedConfigs.map((c) =>
          c.id === id ? { ...c, name: name.trim() || c.name, updatedAt: Date.now() } : c,
        ),
      });
      persistSaved();
    },

    deleteConfig: (id) => {
      set({ savedConfigs: get().savedConfigs.filter((c) => c.id !== id) });
      persistSaved();
    },

    importConfigs: (configs) => {
      const existing = new Set(get().savedConfigs.map((c) => c.id));
      const merged = [...get().savedConfigs, ...configs.filter((c) => !existing.has(c.id))];
      set({ savedConfigs: merged });
      persistSaved();
    },
  };
});

/** Convenience selectors */
export const useParams = () => useConfigStore((s) => s.params);
export const useDerived = () => useConfigStore((s) => s.derived);
export const useUnits = () => useConfigStore((s) => s.units);
export const useSnapshotA = () => useConfigStore((s) => s.snapshotA);
