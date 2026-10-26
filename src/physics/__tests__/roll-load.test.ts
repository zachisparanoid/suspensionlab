import { describe, expect, it } from 'vitest';
import { axleRollStiffness, rollAxisHeightAtCg, rollGradient, springRollStiffness } from '../roll';
import {
  dynamicCornerLoads,
  lateralLoadTransfer,
  longitudinalLoadTransfer,
  staticCornerLoads,
} from '../loadTransfer';
import { G, RAD_PER_DEG } from '../constants';

describe('springRollStiffness', () => {
  it('K = k·t²/2 per axle: 40 N/mm wheels on 1.55 m track', () => {
    // 40000 N/m · 1.55² / 2 = 48050 N·m/rad → ×π/180 ≈ 838.6 N·m/deg
    expect(springRollStiffness(40, 1550)).toBeCloseTo(48050 * RAD_PER_DEG, 1);
  });
  it('ARB adds linearly', () => {
    expect(axleRollStiffness(40, 1550, 400)).toBeCloseTo(springRollStiffness(40, 1550) + 400, 6);
  });
});

describe('rollAxisHeightAtCg', () => {
  it('interpolates between roll centers at the CG position', () => {
    expect(rollAxisHeightAtCg(50, 80, 1325, 2650)).toBeCloseTo(65, 5);
    expect(rollAxisHeightAtCg(50, 80, 0, 2650)).toBe(50);
  });
});

describe('rollGradient', () => {
  it('matches hand calc incl. gravity destabilisation', () => {
    // 1200 kg, 450 mm arm: moment = 1200·9.81·0.45 = 5297.4 N·m/g
    // K = 1600 N·m/deg = 91673 N·m/rad → φ = 5297.4/(91673−5297.4) rad/g
    const expected = (5297.4 / (1600 * (180 / Math.PI) - 5297.4)) * (180 / Math.PI);
    expect(rollGradient(1200, 450, 1600)).toBeCloseTo(expected, 3);
  });
  it('more stiffness → less roll', () => {
    expect(rollGradient(1200, 450, 2400)).toBeLessThan(rollGradient(1200, 450, 1200));
  });
});

describe('lateralLoadTransfer', () => {
  const base = {
    sprungMassKg: 1200,
    axleSprungMassKg: 660,
    axleUnsprungMassKg: 90,
    rollMomentArmMm: 450,
    rollCenterMm: 50,
    unsprungCgMm: 320,
    rollStiffnessShare: 0.55,
    trackMm: 1550,
    lateralG: 1,
  };
  it('is linear in lateral g', () => {
    const at1 = lateralLoadTransfer(base);
    const at05 = lateralLoadTransfer({ ...base, lateralG: 0.5 });
    expect(at05).toBeCloseTo(at1 / 2, 6);
  });
  it('stiffening an axle shifts transfer onto it (total fixed)', () => {
    const more = lateralLoadTransfer({ ...base, rollStiffnessShare: 0.7 });
    expect(more).toBeGreaterThan(lateralLoadTransfer(base));
  });
  it('wider track reduces transfer', () => {
    expect(lateralLoadTransfer({ ...base, trackMm: 1700 })).toBeLessThan(
      lateralLoadTransfer(base),
    );
  });
});

describe('longitudinalLoadTransfer', () => {
  it('ΔW = m·g·a·h/L', () => {
    // 1370 kg, 1 g, 520 mm cg, 2650 mm wb → 1370·9.81·0.52/2.65 ≈ 2637 N
    expect(longitudinalLoadTransfer(1370, -1, 520, 2650)).toBeCloseTo(
      (1370 * G * 520) / 2650,
      1,
    );
  });
});

describe('corner loads', () => {
  it('static loads split by weight distribution and sum to total weight', () => {
    const s = staticCornerLoads(1370, 55);
    expect(s.fl + s.fr + s.rl + s.rr).toBeCloseTo(1370 * G, 3);
    expect(s.fl / (s.fl + s.rl)).toBeCloseTo(0.55, 3);
  });
  it('positive lateral g loads the right side, braking loads the front', () => {
    const { loads } = dynamicCornerLoads({
      totalMassKg: 1370,
      weightDistFrontPct: 55,
      lateralTransferFrontN: 1500,
      lateralTransferRearN: 1200,
      longitudinalG: -0.6,
      longitudinalTransferN: 1580,
    });
    expect(loads.fr).toBeGreaterThan(loads.fl);
    expect(loads.rr).toBeGreaterThan(loads.rl);
    expect(loads.fl + loads.fr).toBeGreaterThan(loads.rl + loads.rr);
  });
  it('clamps lifted corners at zero and reports them', () => {
    const { loads, lifted } = dynamicCornerLoads({
      totalMassKg: 900,
      weightDistFrontPct: 50,
      lateralTransferFrontN: 4000,
      lateralTransferRearN: 4000,
      longitudinalG: 0,
      longitudinalTransferN: 0,
    });
    expect(lifted).toContain('fl');
    expect(lifted).toContain('rl');
    expect(loads.fl).toBe(0);
    expect(Math.min(loads.fr, loads.rr)).toBeGreaterThan(0);
  });
});
