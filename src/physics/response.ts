/**
 * Time- and frequency-domain response: step response, transmissibility sweep,
 * and the road-input simulation used by both the chart and the live schematic.
 */
import {
  ROAD_SIM_DURATION_S,
  ROAD_SIM_MAX_POINTS,
  SIM_DT,
  STEP_SIM_DURATION_S,
  STEP_SIM_MAX_POINTS,
  TRANSMISSIBILITY_MAX_HZ,
  TRANSMISSIBILITY_MIN_HZ,
  TRANSMISSIBILITY_POINTS,
} from './constants';
import { restState, stepRK4, transmissibilityAt, type QuarterCarModel } from './quarterCar';
import type { RoadInputType, SeriesPoint } from '../types';

/**
 * Road profile z_r(t) in metres for a given input type.
 * Bump/pothole are half-sine events whose duration scales with speed
 * (a 1 m feature traversed at `speedKmh`), min 60 ms so it never degenerates.
 */
export function roadProfile(
  type: RoadInputType,
  amplitudeM: number,
  sineFreqHz: number,
  speedKmh: number,
): (t: number) => number {
  const speedMs = Math.max(speedKmh / 3.6, 1);
  const featureLengthM = 1.0;
  const dur = Math.max(featureLengthM / speedMs, 0.06);
  const start = 0.3; // settle time before the event

  switch (type) {
    case 'step':
      return (t) => (t >= start ? amplitudeM : 0);
    case 'bump':
      return (t) => {
        const p = (t - start) / dur;
        return p >= 0 && p <= 1 ? amplitudeM * Math.sin(Math.PI * p) : 0;
      };
    case 'pothole':
      return (t) => {
        const p = (t - start) / dur;
        return p >= 0 && p <= 1 ? -amplitudeM * Math.sin(Math.PI * p) : 0;
      };
    case 'sine':
      return (t) => (t >= start ? amplitudeM * Math.sin(2 * Math.PI * sineFreqHz * (t - start)) : 0);
  }
}

/**
 * Fixed-step RK4 simulation, downsampled to ≤ maxPoints.
 * Returns displacements in mm: y = sprung, y2 = unsprung, y3 = road.
 */
export function simulate(
  model: QuarterCarModel,
  roadAt: (t: number) => number,
  durationS: number,
  maxPoints: number,
): SeriesPoint[] {
  const steps = Math.ceil(durationS / SIM_DT);
  const stride = Math.max(1, Math.ceil((steps + 1) / maxPoints));
  const out: SeriesPoint[] = [];
  let s = restState();

  for (let i = 0; i <= steps; i++) {
    const t = i * SIM_DT;
    if (i % stride === 0) {
      out.push({
        x: t,
        y: s.zs * 1000,
        y2: s.zu * 1000,
        y3: roadAt(t) * 1000,
      });
    }
    s = stepRK4(model, s, t, SIM_DT, roadAt);
    // Blow-up guard: freeze rather than emit Infinity/NaN.
    if (!Number.isFinite(s.zs) || Math.abs(s.zs) > 10) {
      s = { zs: 0, vs: 0, zu: 0, vu: 0 };
    }
  }
  return out;
}

/** Step response to a 20 mm road step (fixed input so setups compare fairly). */
export function stepResponse(model: QuarterCarModel): SeriesPoint[] {
  const road = roadProfile('step', 0.02, 0, 80);
  return simulate(model, road, STEP_SIM_DURATION_S, STEP_SIM_MAX_POINTS);
}

/** Response to the user's selected road input. */
export function roadResponse(
  model: QuarterCarModel,
  type: RoadInputType,
  amplitudeMm: number,
  sineFreqHz: number,
  speedKmh: number,
): SeriesPoint[] {
  const road = roadProfile(type, amplitudeMm / 1000, sineFreqHz, speedKmh);
  return simulate(model, road, ROAD_SIM_DURATION_S, ROAD_SIM_MAX_POINTS);
}

export interface TransmissibilityResult {
  series: SeriesPoint[];
  /** Peak gain (resonance magnification). */
  peak: number;
  /** Frequency of that peak, Hz. */
  peakHz: number;
  /** First frequency above the peak where gain drops below 1 (isolation begins). */
  isolationAboveHz: number;
}

export function transmissibilitySweep(model: QuarterCarModel): TransmissibilityResult {
  const series: SeriesPoint[] = [];
  const logMin = Math.log10(TRANSMISSIBILITY_MIN_HZ);
  const logMax = Math.log10(TRANSMISSIBILITY_MAX_HZ);
  let peak = 0;
  let peakHz = TRANSMISSIBILITY_MIN_HZ;

  for (let i = 0; i < TRANSMISSIBILITY_POINTS; i++) {
    const f = 10 ** (logMin + ((logMax - logMin) * i) / (TRANSMISSIBILITY_POINTS - 1));
    const gain = transmissibilityAt(model, f);
    const safe = Number.isFinite(gain) ? Math.min(gain, 50) : 0;
    series.push({ x: f, y: safe });
    if (safe > peak) {
      peak = safe;
      peakHz = f;
    }
  }

  let isolationAboveHz = TRANSMISSIBILITY_MAX_HZ;
  for (const p of series) {
    if (p.x > peakHz && p.y < 1) {
      isolationAboveHz = p.x;
      break;
    }
  }

  return { series, peak, peakHz, isolationAboveHz };
}
