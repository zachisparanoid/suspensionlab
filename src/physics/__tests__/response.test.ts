import { describe, expect, it } from 'vitest';
import type { QuarterCarModel } from '../quarterCar';
import { transmissibilityAt } from '../quarterCar';
import { roadProfile, stepResponse, transmissibilitySweep } from '../response';

/** Believable sports-car front corner: 330 kg on 45 N/mm wheel rate. */
const model = (over: Partial<QuarterCarModel> = {}): QuarterCarModel => ({
  ms: 330,
  mu: 45,
  kw: 45_000,
  kt: 250_000,
  cBump: 3_000,
  cRebound: 4_500,
  ...over,
});

describe('stepResponse', () => {
  it('settles near the step height and stays finite', () => {
    const series = stepResponse(model());
    expect(series.length).toBeLessThanOrEqual(401);
    const last = series[series.length - 1]!;
    expect(last.y).toBeGreaterThan(15);
    expect(last.y).toBeLessThan(25);
    expect(series.every((p) => Number.isFinite(p.y))).toBe(true);
  });

  it('underdamped setups overshoot more than well-damped ones', () => {
    const soft = stepResponse(model({ cBump: 300, cRebound: 300 }));
    const firm = stepResponse(model({ cBump: 5_000, cRebound: 5_000 }));
    const peak = (s: typeof soft) => Math.max(...s.map((p) => p.y));
    expect(peak(soft)).toBeGreaterThan(peak(firm));
    expect(peak(soft)).toBeGreaterThan(25); // visible overshoot past 20 mm step
  });
});

describe('transmissibility', () => {
  it('gain → 1 at very low frequency (body follows the road)', () => {
    expect(transmissibilityAt(model(), 0.05)).toBeCloseTo(1, 1);
  });

  it('resonates near the sprung natural frequency and isolates above it', () => {
    const { peak, peakHz, isolationAboveHz } = transmissibilitySweep(model());
    // f_ride ≈ (1/2π)√(k_ride/ms), k_ride = 45·250/295 k = 38.1 kN/m → 1.71 Hz
    expect(peakHz).toBeGreaterThan(1.2);
    expect(peakHz).toBeLessThan(2.4);
    expect(peak).toBeGreaterThan(1);
    expect(isolationAboveHz).toBeGreaterThan(peakHz);
  });

  it('less damping → taller resonance peak', () => {
    const soft = transmissibilitySweep(model({ cBump: 800, cRebound: 800 }));
    const firm = transmissibilitySweep(model({ cBump: 6_000, cRebound: 6_000 }));
    expect(soft.peak).toBeGreaterThan(firm.peak);
  });
});

describe('roadProfile', () => {
  it('bump and pothole mirror each other', () => {
    const bump = roadProfile('bump', 0.05, 0, 80);
    const hole = roadProfile('pothole', 0.05, 0, 80);
    expect(bump(0.35)).toBeGreaterThan(0);
    expect(hole(0.35)).toBeCloseTo(-bump(0.35), 9);
  });
  it('is zero before the event starts', () => {
    expect(roadProfile('bump', 0.05, 0, 80)(0.1)).toBe(0);
    expect(roadProfile('sine', 0.05, 2, 80)(0.1)).toBe(0);
  });
});
