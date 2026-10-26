/**
 * Lateral / longitudinal load transfer and corner loads.
 *
 * Lateral transfer per axle uses the classic three-path formula:
 *   1. elastic   — sprung mass rolling on springs/ARBs, split by roll-stiffness share
 *   2. geometric — sprung force reacted directly through the roll center height
 *   3. unsprung  — the axle's own unsprung mass at roughly wheel-center height
 * This is why an ARB changes *distribution* (path 1's split) but total
 * transfer stays fixed by CG height and track — the core balance lesson.
 */
import { EPS, G } from './constants';
import type { CornerLoads } from '../types';

export interface LateralTransferInput {
  /** Total sprung mass, kg. */
  sprungMassKg: number;
  /** Sprung mass carried by this axle, kg. */
  axleSprungMassKg: number;
  /** Unsprung mass of this axle (both corners), kg. */
  axleUnsprungMassKg: number;
  /** CG height above the roll axis at the CG position, mm. */
  rollMomentArmMm: number;
  /** This axle's roll center height, mm. */
  rollCenterMm: number;
  /** Unsprung CG height ≈ wheel center, mm. */
  unsprungCgMm: number;
  /** This axle's share of total roll stiffness, 0–1. */
  rollStiffnessShare: number;
  /** Track width, mm. */
  trackMm: number;
  /** Lateral acceleration, g. */
  lateralG: number;
}

/** Per-axle lateral load transfer, N (amount moved inner → outer). */
export function lateralLoadTransfer(i: LateralTransferInput): number {
  const t = i.trackMm / 1000;
  if (t < EPS) return 0;
  const elastic = ((i.sprungMassKg * G * Math.max(i.rollMomentArmMm, 0)) / 1000 / t) * i.rollStiffnessShare;
  const geometric = (i.axleSprungMassKg * G * (i.rollCenterMm / 1000)) / t;
  const unsprung = (i.axleUnsprungMassKg * G * (i.unsprungCgMm / 1000)) / t;
  return i.lateralG * (elastic + geometric + unsprung);
}

/**
 * Longitudinal load transfer, N per axle pair:
 * ΔW = m_total·g·|a_x|·h_cg / L. Braking (a_x < 0) loads the front.
 */
export function longitudinalLoadTransfer(
  totalMassKg: number,
  longitudinalG: number,
  cgHeightMm: number,
  wheelbaseMm: number,
): number {
  if (wheelbaseMm < EPS) return 0;
  return (totalMassKg * G * Math.abs(longitudinalG) * cgHeightMm) / wheelbaseMm;
}

export interface CornerLoadInput {
  totalMassKg: number;
  weightDistFrontPct: number;
  lateralTransferFrontN: number;
  lateralTransferRearN: number;
  /** Signed: braking < 0 (front gains), accel > 0 (rear gains). */
  longitudinalG: number;
  longitudinalTransferN: number;
}

export function staticCornerLoads(totalMassKg: number, weightDistFrontPct: number): CornerLoads {
  const w = totalMassKg * G;
  const front = (w * weightDistFrontPct) / 100;
  const rear = w - front;
  return { fl: front / 2, fr: front / 2, rl: rear / 2, rr: rear / 2 };
}

/**
 * Dynamic corner loads under the combined scenario, N, clamped at zero.
 * Convention: positive lateralG = left-hand turn, so the RIGHT side is outer
 * and gains load. Returns the loads plus which corners lifted.
 */
export function dynamicCornerLoads(i: CornerLoadInput): {
  loads: CornerLoads;
  lifted: Array<keyof CornerLoads>;
} {
  const s = staticCornerLoads(i.totalMassKg, i.weightDistFrontPct);
  const longFrontDelta = i.longitudinalG < 0 ? i.longitudinalTransferN : -i.longitudinalTransferN;

  const raw: CornerLoads = {
    fl: s.fl - i.lateralTransferFrontN + longFrontDelta / 2,
    fr: s.fr + i.lateralTransferFrontN + longFrontDelta / 2,
    rl: s.rl - i.lateralTransferRearN - longFrontDelta / 2,
    rr: s.rr + i.lateralTransferRearN - longFrontDelta / 2,
  };

  const lifted: Array<keyof CornerLoads> = [];
  const loads = { ...raw };
  (Object.keys(raw) as Array<keyof CornerLoads>).forEach((k) => {
    if (raw[k] <= 0) {
      loads[k] = 0;
      lifted.push(k);
    }
  });
  return { loads, lifted };
}
