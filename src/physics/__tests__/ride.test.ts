import { describe, expect, it } from 'vitest';
import {
  criticalDamping,
  dampingBand,
  dampingRatio,
  rideFrequency,
  rideRate,
  unsprungFrequency,
  wheelRate,
} from '../ride';

describe('wheelRate', () => {
  it('applies motion ratio squared', () => {
    expect(wheelRate(50, 1)).toBe(50);
    expect(wheelRate(50, 0.8)).toBeCloseTo(32, 5);
    expect(wheelRate(100, 0.5)).toBeCloseTo(25, 5);
  });
});

describe('rideRate', () => {
  it('is the series combination of wheel and tire rates', () => {
    // 40 N/mm wheel + 250 N/mm tire → (40·250)/290 ≈ 34.48
    expect(rideRate(40, 250)).toBeCloseTo(34.4828, 3);
  });
  it('is always below the softer spring', () => {
    expect(rideRate(40, 250)).toBeLessThan(40);
    expect(rideRate(300, 250)).toBeLessThan(250);
  });
  it('guards zero denominator', () => {
    expect(rideRate(0, 0)).toBe(0);
  });
});

describe('rideFrequency', () => {
  it('matches hand calculation f = (1/2π)√(k/m)', () => {
    // 30 N/mm = 30000 N/m on 300 kg → √100 = 10 rad/s → 1.5915 Hz
    expect(rideFrequency(30, 300)).toBeCloseTo(1.5915, 3);
  });
  it('scales with √k', () => {
    const f1 = rideFrequency(30, 300);
    const f2 = rideFrequency(120, 300);
    expect(f2 / f1).toBeCloseTo(2, 5);
  });
  it('returns 0 for degenerate inputs instead of NaN/Infinity', () => {
    expect(rideFrequency(30, 0)).toBe(0);
    expect(rideFrequency(0, 300)).toBe(0);
  });
});

describe('criticalDamping & dampingRatio', () => {
  it('c_crit = 2√(km): 30 N/mm on 300 kg → 6 N·s/mm', () => {
    expect(criticalDamping(30, 300)).toBeCloseTo(6, 4);
  });
  it('half of critical gives ζ = 0.5', () => {
    expect(dampingRatio(3, 1, 30, 300)).toBeCloseTo(0.5, 4);
  });
  it('damper acts through MR² like the spring', () => {
    // Same damper through MR 0.8 delivers 0.64× at the wheel, but wheel rate
    // also provided post-MR here, so compare directly:
    const zDirect = dampingRatio(3, 1, 30, 300);
    const zThroughMr = dampingRatio(3 / 0.64, 0.8, 30, 300);
    expect(zThroughMr).toBeCloseTo(zDirect, 4);
  });
  it('clamps absurd ratios for display', () => {
    expect(dampingRatio(500, 1, 1, 100)).toBeLessThanOrEqual(5);
  });
  it('bands classify sensibly', () => {
    expect(dampingBand(0.3)).toBe('underdamped');
    expect(dampingBand(0.7)).toBe('sporty');
    expect(dampingBand(1.0)).toBe('critical');
    expect(dampingBand(1.5)).toBe('overdamped');
  });
});

describe('unsprungFrequency', () => {
  it('wheel hop: (30+250) N/mm on 40 kg → ~13.3 Hz', () => {
    // √(280000/40) = √7000 ≈ 83.67 rad/s → 13.31 Hz
    expect(unsprungFrequency(30, 250, 40)).toBeCloseTo(13.316, 2);
  });
  it('sits an order of magnitude above body frequency', () => {
    expect(unsprungFrequency(30, 250, 40)).toBeGreaterThan(5 * rideFrequency(30, 300));
  });
});
