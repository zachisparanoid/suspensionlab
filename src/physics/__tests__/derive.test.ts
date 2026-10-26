import { describe, expect, it } from 'vitest';
import { derive, deriveNumeric, toSummaryDerived } from '../derive';
import { computeFitment } from '../fitment';
import { DEFAULT_PARAMS } from '../../data/presets';
import type { SuspensionParams } from '../../types';

const params = (over: Partial<SuspensionParams> = {}): SuspensionParams => ({
  ...DEFAULT_PARAMS,
  ...over,
});

describe('deriveNumeric', () => {
  it('produces believable numbers for the default car', () => {
    const d = deriveNumeric(params());
    expect(d.rideFrequencyFront).toBeGreaterThan(0.8);
    expect(d.rideFrequencyFront).toBeLessThan(3);
    expect(d.dampingRatioFront).toBeGreaterThan(0.2);
    expect(d.dampingRatioFront).toBeLessThan(1.5);
    expect(d.rollGradient).toBeGreaterThan(0.5);
    expect(d.rollGradient).toBeLessThan(10);
    expect(d.rollStiffnessDistFront).toBeGreaterThan(30);
    expect(d.rollStiffnessDistFront).toBeLessThan(80);
  });

  it('stiffer springs → higher ride frequency', () => {
    const soft = deriveNumeric(params({ springRateFront: 30 }));
    const stiff = deriveNumeric(params({ springRateFront: 90 }));
    expect(stiff.rideFrequencyFront).toBeGreaterThan(soft.rideFrequencyFront);
  });

  it('bigger rear ARB shifts balance toward oversteer', () => {
    const base = deriveNumeric(params({ arbStiffnessRear: 0 }));
    const barred = deriveNumeric(params({ arbStiffnessRear: 1200 }));
    expect(barred.balanceIndex).toBeGreaterThan(base.balanceIndex);
    expect(barred.rollStiffnessDistFront).toBeLessThan(base.rollStiffnessDistFront);
  });

  it('total lateral transfer is set by CG/track, not stiffness distribution', () => {
    // Equal tracks so the invariant is exact (unequal tracks shift it slightly).
    const eq = { trackFront: 1550, trackRear: 1550 };
    const a = deriveNumeric(params({ ...eq, arbStiffnessFront: 0, arbStiffnessRear: 1200 }));
    const b = deriveNumeric(params({ ...eq, arbStiffnessFront: 1200, arbStiffnessRear: 0 }));
    const totalA = a.lateralLoadTransferFront + a.lateralLoadTransferRear;
    const totalB = b.lateralLoadTransferFront + b.lateralLoadTransferRear;
    expect(totalA).toBeCloseTo(totalB, 6);
  });

  it('detects wheel lift at silly lateral g on a tall narrow car', () => {
    const d = deriveNumeric(
      params({ lateralG: 1.6, cgHeight: 700, trackFront: 1300, trackRear: 1300 }),
    );
    expect(d.wheelLift).toBe(true);
    expect(d.liftedCorners.length).toBeGreaterThan(0);
  });

  it('never emits NaN even with hostile inputs', () => {
    const d = deriveNumeric(
      params({ vehicleMassSprung: 600, weightDistFront: 65, springRateFront: 15, motionRatioFront: 0.5 }),
    );
    const flat = toSummaryDerived({ ...d, transmissibilityPeak: 1, isolationAboveHz: 2, stepResponseSeries: [], transmissibilitySeries: [], roadResponseSeries: [] });
    for (const v of Object.values(flat)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('derive (full, with series)', () => {
  it('assembles chart series with capped lengths', () => {
    const d = derive(params());
    expect(d.stepResponseSeries.length).toBeGreaterThan(100);
    expect(d.stepResponseSeries.length).toBeLessThanOrEqual(401);
    expect(d.transmissibilitySeries.length).toBe(200);
    expect(d.transmissibilityPeak).toBeGreaterThan(1);
  });
});

describe('fitment', () => {
  const fit = (over = {}) =>
    computeFitment({
      wheelDiameterIn: 17,
      wheelWidthIn: 7,
      wheelOffsetMm: 45,
      tireWidthMm: 225,
      tireAspectPct: 45,
      tireStaticRadiusMm: 320,
      rideHeightFrontMm: 140,
      rideHeightRearMm: 145,
      camberFrontDeg: -2,
      ...over,
    });

  it('computes overall diameter: 225/45R17 ≈ 634 mm', () => {
    expect(fit().tireOverallDiameter).toBeCloseTo(17 * 25.4 + 2 * 101.25, 1);
  });

  it('stock wheel = zero poke; wider/lower offset pokes out', () => {
    expect(fit().pokeMm).toBeCloseTo(0, 6);
    expect(fit({ wheelWidthIn: 9, wheelOffsetMm: 20 }).pokeMm).toBeCloseTo(
      (9 - 7) * 12.7 + 25,
      5,
    );
  });

  it('slamming the car closes the fender gap', () => {
    const stock = fit();
    const slammed = fit({ rideHeightFrontMm: 80, rideHeightRearMm: 80 });
    expect(slammed.fenderGapFront).toBeLessThan(stock.fenderGapFront);
  });

  it('stretched tire on wide wheel → stretch factor < 1', () => {
    expect(fit({ wheelWidthIn: 10, tireWidthMm: 215 }).stretchFactor).toBeLessThan(0.9);
  });

  it('flags rub risk when slammed + poked', () => {
    const sketchy = fit({
      rideHeightFrontMm: 80,
      rideHeightRearMm: 80,
      wheelWidthIn: 10,
      wheelOffsetMm: 0,
    });
    expect(['close', 'rubbing']).toContain(sketchy.rubRisk);
  });
});
