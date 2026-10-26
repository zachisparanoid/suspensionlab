/**
 * Centralised SI ↔ Imperial conversion and formatting.
 * State is ALWAYS stored in SI; conversion happens only at display/input time,
 * so round-tripping is lossless by construction.
 */
import type { UnitSystem } from '../types';

export type UnitKind =
  | 'mass' // kg ↔ lb
  | 'length' // mm ↔ in
  | 'stiffness' // N/mm ↔ lb/in
  | 'damping' // N·s/mm ↔ lb·s/in
  | 'rollStiffness' // N·m/deg ↔ ft·lb/deg
  | 'force' // N ↔ lbf
  | 'speed' // km/h ↔ mph
  | 'frequency' // Hz (same)
  | 'angle' // deg (same)
  | 'anglePerG' // deg/g (same)
  | 'percent'
  | 'g'
  | 'ratio'
  | 'inches' // industry-standard inches even in SI mode (wheel sizes)
  | 'none';

const KG_TO_LB = 2.2046226218;
const MM_TO_IN = 1 / 25.4;
const NPMM_TO_LBIN = 5.7101471627; // (N/mm → lbf/in): 1 N/mm = 1000 N/m = 5.710 lbf/in
const N_TO_LBF = 0.2248089431;
const NM_TO_FTLB = 0.7375621493;
const KMH_TO_MPH = 0.6213711922;

interface UnitDef {
  toImperial: (si: number) => number;
  fromImperial: (imp: number) => number;
  siLabel: string;
  impLabel: string;
}

const identity = (siLabel: string): UnitDef => ({
  toImperial: (v) => v,
  fromImperial: (v) => v,
  siLabel,
  impLabel: siLabel,
});

const DEFS: Record<UnitKind, UnitDef> = {
  mass: {
    toImperial: (v) => v * KG_TO_LB,
    fromImperial: (v) => v / KG_TO_LB,
    siLabel: 'kg',
    impLabel: 'lb',
  },
  length: {
    toImperial: (v) => v * MM_TO_IN,
    fromImperial: (v) => v / MM_TO_IN,
    siLabel: 'mm',
    impLabel: 'in',
  },
  stiffness: {
    toImperial: (v) => v * NPMM_TO_LBIN,
    fromImperial: (v) => v / NPMM_TO_LBIN,
    siLabel: 'N/mm',
    impLabel: 'lb/in',
  },
  damping: {
    toImperial: (v) => v * NPMM_TO_LBIN,
    fromImperial: (v) => v / NPMM_TO_LBIN,
    siLabel: 'N·s/mm',
    impLabel: 'lb·s/in',
  },
  rollStiffness: {
    toImperial: (v) => v * NM_TO_FTLB,
    fromImperial: (v) => v / NM_TO_FTLB,
    siLabel: 'N·m/deg',
    impLabel: 'ft·lb/deg',
  },
  force: {
    toImperial: (v) => v * N_TO_LBF,
    fromImperial: (v) => v / N_TO_LBF,
    siLabel: 'N',
    impLabel: 'lbf',
  },
  speed: {
    toImperial: (v) => v * KMH_TO_MPH,
    fromImperial: (v) => v / KMH_TO_MPH,
    siLabel: 'km/h',
    impLabel: 'mph',
  },
  frequency: identity('Hz'),
  angle: identity('deg'),
  anglePerG: identity('deg/g'),
  percent: identity('%'),
  g: identity('g'),
  ratio: identity(''),
  inches: identity('in'),
  none: identity(''),
};

/** Convert a stored SI value to the display value for the active unit system. */
export function toDisplay(siValue: number, kind: UnitKind, units: UnitSystem): number {
  return units === 'imperial' ? DEFS[kind].toImperial(siValue) : siValue;
}

/** Convert a typed display value back to canonical SI for storage. */
export function fromDisplay(displayValue: number, kind: UnitKind, units: UnitSystem): number {
  return units === 'imperial' ? DEFS[kind].fromImperial(displayValue) : displayValue;
}

export function unitLabel(kind: UnitKind, units: UnitSystem): string {
  return units === 'imperial' ? DEFS[kind].impLabel : DEFS[kind].siLabel;
}

/** Map a param/stat's SI unit string to a UnitKind. */
export function kindForUnit(siUnit: string): UnitKind {
  switch (siUnit) {
    case 'kg':
      return 'mass';
    case 'mm':
      return 'length';
    case 'N/mm':
      return 'stiffness';
    case 'N·s/mm':
      return 'damping';
    case 'N·m/deg':
      return 'rollStiffness';
    case 'N':
      return 'force';
    case 'km/h':
      return 'speed';
    case 'Hz':
      return 'frequency';
    case 'deg':
      return 'angle';
    case 'deg/g':
      return 'anglePerG';
    case '%':
      return 'percent';
    case 'g':
      return 'g';
    case 'in':
      return 'inches';
    case '':
      return 'ratio';
    default:
      return 'none';
  }
}

/**
 * Format a number for display: fixed decimals, thousands separators for large
 * values, and an em-dash for anything non-finite (NaN/Infinity never render).
 */
export function formatValue(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const d = abs >= 1000 ? Math.min(decimals, 0) : decimals;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/** Format a stored-SI value in the active units, with its label. */
export function formatWithUnit(
  siValue: number,
  siUnit: string,
  units: UnitSystem,
  decimals = 2,
): string {
  const kind = kindForUnit(siUnit);
  const v = toDisplay(siValue, kind, units);
  const label = unitLabel(kind, units);
  return label ? `${formatValue(v, decimals)} ${label}` : formatValue(v, decimals);
}
