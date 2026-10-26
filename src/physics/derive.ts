/**
 * Single entrypoint: SuspensionParams → DerivedStats.
 *
 * `deriveNumeric` computes every scalar stat (fast; runs on every keystroke).
 * `deriveSeries` computes the chart arrays (heavier; the UI throttles it).
 * `derive` returns both — use it in tests and non-hot paths.
 */
import { EPS, G, NSPMM_TO_NSPM } from './constants';
import type { QuarterCarModel } from './quarterCar';
import {
  criticalDamping,
  dampingBand,
  dampingRatio,
  rideFrequency,
  rideRate,
  unsprungFrequency,
  wheelRate,
} from './ride';
import { axleRollStiffness, rollAxisHeightAtCg, rollGradient, springRollStiffness } from './roll';
import {
  dynamicCornerLoads,
  lateralLoadTransfer,
  longitudinalLoadTransfer,
  staticCornerLoads,
} from './loadTransfer';
import { pitchGradient, pitchStiffness } from './geometry';
import { computeFitment } from './fitment';
import { roadResponse, stepResponse, transmissibilitySweep } from './response';
import type { AxleStats, DerivedStats, DerivedStatsSummary, SuspensionParams } from '../types';

/** Quarter-car model (SI base units) for one axle — shared by charts & animation. */
export function quarterCarModel(p: SuspensionParams, axle: 'front' | 'rear'): QuarterCarModel {
  const front = axle === 'front';
  const distShare = front ? p.weightDistFront / 100 : 1 - p.weightDistFront / 100;
  const ms = Math.max((p.vehicleMassSprung * distShare) / 2, 1);
  const mr = front ? p.motionRatioFront : p.motionRatioRear;
  const kw = wheelRate(front ? p.springRateFront : p.springRateRear, mr);
  return {
    ms,
    mu: Math.max(front ? p.unsprungMassFront : p.unsprungMassRear, 1),
    kw: Math.max(kw, EPS) * 1000,
    kt: Math.max(front ? p.tireStiffnessFront : p.tireStiffnessRear, EPS) * 1000,
    cBump: (front ? p.damperBumpFront : p.damperBumpRear) * mr * mr * NSPMM_TO_NSPM,
    cRebound: (front ? p.damperReboundFront : p.damperReboundRear) * mr * mr * NSPMM_TO_NSPM,
  };
}

function axleStats(p: SuspensionParams, axle: 'front' | 'rear', warnings: string[]): AxleStats {
  const front = axle === 'front';
  const distShare = front ? p.weightDistFront / 100 : 1 - p.weightDistFront / 100;
  const cornerSprungMass = (p.vehicleMassSprung * distShare) / 2;
  if (cornerSprungMass <= 0) {
    warnings.push(`${axle} corner sprung mass is non-positive; check mass and weight distribution`);
  }
  const msSafe = Math.max(cornerSprungMass, 1);

  const mr = front ? p.motionRatioFront : p.motionRatioRear;
  const spring = front ? p.springRateFront : p.springRateRear;
  const tire = front ? p.tireStiffnessFront : p.tireStiffnessRear;
  const bump = front ? p.damperBumpFront : p.damperBumpRear;
  const rebound = front ? p.damperReboundFront : p.damperReboundRear;
  const track = front ? p.trackFront : p.trackRear;
  const arb = front ? p.arbStiffnessFront : p.arbStiffnessRear;
  const mu = front ? p.unsprungMassFront : p.unsprungMassRear;

  const kw = wheelRate(spring, mr);
  const kr = rideRate(kw, tire);
  const zb = dampingRatio(bump, mr, kw, msSafe);
  const zr = dampingRatio(rebound, mr, kw, msSafe);

  return {
    wheelRate: kw,
    rideRate: kr,
    rideFrequency: rideFrequency(kr, msSafe),
    dampingRatio: (zb + zr) / 2,
    dampingRatioBump: zb,
    dampingRatioRebound: zr,
    criticalDamping: criticalDamping(kw, msSafe),
    rollStiffness: axleRollStiffness(kw, track, arb),
    rollStiffnessSprings: springRollStiffness(kw, track),
    unsprungFrequency: unsprungFrequency(kw, tire, mu),
    cornerSprungMass: msSafe,
  };
}

/**
 * Comfort heuristic (0–100), documented:
 *   start at 100; penalise ride frequency above 1.0 Hz (−28/Hz),
 *   damping ratio away from 0.55 comfort sweet spot (−60/unit),
 *   resonance peak above 1.5× (−12/unit), roll gradient stiffer than plush
 *   is *good* for sport not comfort so soft roll adds nothing back.
 */
function comfortScore(fAvg: number, zAvg: number, peak: number): number {
  let s = 100;
  s -= Math.max(fAvg - 1.0, 0) * 28;
  s -= Math.abs(zAvg - 0.55) * 60;
  s -= Math.max(peak - 1.5, 0) * 12;
  return Math.round(Math.min(Math.max(s, 0), 100));
}

/**
 * Sport heuristic (0–100), documented:
 *   reward ride frequency toward 2.2 Hz (+45 at 2.2, scaled),
 *   damping near 0.7 (−50/unit deviation), flat body (low roll gradient:
 *   +30 at ≤0.5 deg/g fading to 0 at 3 deg/g), quick isolation.
 */
function sportScore(fAvg: number, zAvg: number, rollGrad: number): number {
  let s = 0;
  s += Math.min(fAvg / 2.2, 1.15) * 45;
  s += Math.max(1 - Math.abs(zAvg - 0.7) / 0.5, 0) * 25;
  s += Math.max(1 - Math.max(rollGrad - 0.5, 0) / 2.5, 0) * 30;
  return Math.round(Math.min(Math.max(s, 0), 100));
}

export function deriveNumeric(p: SuspensionParams): Omit<
  DerivedStats,
  'stepResponseSeries' | 'transmissibilitySeries' | 'roadResponseSeries' | 'transmissibilityPeak' | 'isolationAboveHz'
> {
  const warnings: string[] = [];
  const front = axleStats(p, 'front', warnings);
  const rear = axleStats(p, 'rear', warnings);

  const totalMass = p.vehicleMassSprung + 2 * p.unsprungMassFront + 2 * p.unsprungMassRear;
  const sprungFrontAxle = (p.vehicleMassSprung * p.weightDistFront) / 100;
  const sprungRearAxle = p.vehicleMassSprung - sprungFrontAxle;

  // CG longitudinal position from front axle: a = L·(rear weight share).
  const cgFromFront = p.wheelbase * (1 - p.weightDistFront / 100);
  const rollAxisAtCg = rollAxisHeightAtCg(
    p.rollCenterHeightFront,
    p.rollCenterHeightRear,
    cgFromFront,
    p.wheelbase,
  );
  const rollMomentArm = p.cgHeight - rollAxisAtCg;

  const totalRollStiffness = front.rollStiffness + rear.rollStiffness;
  const rollShareFront = totalRollStiffness > EPS ? front.rollStiffness / totalRollStiffness : 0.5;
  const rollGrad = rollGradient(p.vehicleMassSprung, rollMomentArm, totalRollStiffness);

  const lltF = lateralLoadTransfer({
    sprungMassKg: p.vehicleMassSprung,
    axleSprungMassKg: sprungFrontAxle,
    axleUnsprungMassKg: 2 * p.unsprungMassFront,
    rollMomentArmMm: rollMomentArm,
    rollCenterMm: p.rollCenterHeightFront,
    unsprungCgMm: p.tireStaticRadius,
    rollStiffnessShare: rollShareFront,
    trackMm: p.trackFront,
    lateralG: p.lateralG,
  });
  const lltR = lateralLoadTransfer({
    sprungMassKg: p.vehicleMassSprung,
    axleSprungMassKg: sprungRearAxle,
    axleUnsprungMassKg: 2 * p.unsprungMassRear,
    rollMomentArmMm: rollMomentArm,
    rollCenterMm: p.rollCenterHeightRear,
    unsprungCgMm: p.tireStaticRadius,
    rollStiffnessShare: 1 - rollShareFront,
    trackMm: p.trackRear,
    lateralG: p.lateralG,
  });

  // Balance: compare front share of TOTAL lateral transfer with front weight
  // share. Transferring proportionally more up front than the weight it
  // carries → front tires saturate first → understeer (negative index).
  const lltTotal = lltF + lltR;
  const lltdFront = lltTotal > EPS ? (lltF / lltTotal) * 100 : rollShareFront * 100;
  const balanceIndex = Math.round(
    Math.min(Math.max((p.weightDistFront - lltdFront) * 5, -100), 100),
  );

  const longTransfer = longitudinalLoadTransfer(totalMass, p.longitudinalG, p.cgHeight, p.wheelbase);
  const { loads: dynLoads, lifted } = dynamicCornerLoads({
    totalMassKg: totalMass,
    weightDistFrontPct: p.weightDistFront,
    lateralTransferFrontN: lltF,
    lateralTransferRearN: lltR,
    longitudinalG: p.longitudinalG,
    longitudinalTransferN: longTransfer,
  });

  const kPitch = pitchStiffness(front.wheelRate, rear.wheelRate, cgFromFront, p.wheelbase);
  const pitchGrad = pitchGradient(p.vehicleMassSprung, p.cgHeight, kPitch, p.antiDive, p.antiSquat);

  const fAvg = (front.rideFrequency + rear.rideFrequency) / 2;
  const zAvg = (front.dampingRatio + rear.dampingRatio) / 2;

  const fitment = computeFitment({
    wheelDiameterIn: p.wheelDiameterIn,
    wheelWidthIn: p.wheelWidthIn,
    wheelOffsetMm: p.wheelOffsetMm,
    tireWidthMm: p.tireWidthMm,
    tireAspectPct: p.tireAspectPct,
    tireStaticRadiusMm: p.tireStaticRadius,
    rideHeightFrontMm: p.rideHeightFront,
    rideHeightRearMm: p.rideHeightRear,
    camberFrontDeg: p.camberFront,
  });

  const degenerate =
    !Number.isFinite(front.rideFrequency) ||
    !Number.isFinite(rear.rideFrequency) ||
    p.vehicleMassSprung <= 0;
  if (degenerate) warnings.push('Degenerate inputs detected; some values are guarded');

  return {
    front,
    rear,
    wheelRateFront: front.wheelRate,
    wheelRateRear: rear.wheelRate,
    rideFrequencyFront: front.rideFrequency,
    rideFrequencyRear: rear.rideFrequency,
    frequencySplit: front.rideFrequency > EPS ? rear.rideFrequency / front.rideFrequency : 0,
    dampingRatioFront: front.dampingRatio,
    dampingRatioRear: rear.dampingRatio,
    dampingBandFront: dampingBand(front.dampingRatio),
    dampingBandRear: dampingBand(rear.dampingRatio),
    criticalDampingFront: front.criticalDamping,
    criticalDampingRear: rear.criticalDamping,
    rollStiffnessFront: front.rollStiffness,
    rollStiffnessRear: rear.rollStiffness,
    totalRollStiffness,
    rollGradient: rollGrad,
    rollStiffnessDistFront: rollShareFront * 100,
    lltdFront,
    lateralLoadTransferFront: lltF,
    lateralLoadTransferRear: lltR,
    longitudinalLoadTransfer: longTransfer,
    staticCornerLoads: staticCornerLoads(totalMass, p.weightDistFront),
    dynamicCornerLoads: dynLoads,
    wheelLift: lifted.length > 0,
    liftedCorners: lifted,
    pitchGradient: pitchGrad,
    unsprungFrequencyFront: front.unsprungFrequency,
    unsprungFrequencyRear: rear.unsprungFrequency,
    balanceIndex,
    comfortIndex: comfortScore(fAvg, zAvg, 2), // peak refined by deriveSeries
    sportIndex: sportScore(fAvg, zAvg, rollGrad),
    fitment,
    degenerate,
    warnings,
  };
}

export interface DerivedSeries {
  stepResponseSeries: DerivedStats['stepResponseSeries'];
  transmissibilitySeries: DerivedStats['transmissibilitySeries'];
  roadResponseSeries: DerivedStats['roadResponseSeries'];
  transmissibilityPeak: number;
  isolationAboveHz: number;
}

export function deriveSeries(p: SuspensionParams): DerivedSeries {
  const model = quarterCarModel(p, 'front');
  const sweep = transmissibilitySweep(model);
  return {
    stepResponseSeries: stepResponse(model),
    transmissibilitySeries: sweep.series,
    roadResponseSeries: roadResponse(model, p.roadInput, p.amplitudeMm, p.sineFreqHz, p.vehicleSpeed),
    transmissibilityPeak: sweep.peak,
    isolationAboveHz: sweep.isolationAboveHz,
  };
}

export function derive(p: SuspensionParams): DerivedStats {
  const numeric = deriveNumeric(p);
  const series = deriveSeries(p);
  const fAvg = (numeric.front.rideFrequency + numeric.rear.rideFrequency) / 2;
  const zAvg = (numeric.front.dampingRatio + numeric.rear.dampingRatio) / 2;
  return {
    ...numeric,
    ...series,
    comfortIndex: comfortScore(fAvg, zAvg, series.transmissibilityPeak),
  };
}

/** Trim to the numeric subset shared with the AI endpoint. */
export function toSummaryDerived(d: DerivedStats): DerivedStatsSummary {
  return {
    wheelRateFront: d.wheelRateFront,
    wheelRateRear: d.wheelRateRear,
    rideFrequencyFront: d.rideFrequencyFront,
    rideFrequencyRear: d.rideFrequencyRear,
    frequencySplit: d.frequencySplit,
    dampingRatioFront: d.dampingRatioFront,
    dampingRatioRear: d.dampingRatioRear,
    rollGradient: d.rollGradient,
    rollStiffnessDistFront: d.rollStiffnessDistFront,
    totalRollStiffness: d.totalRollStiffness,
    lateralLoadTransferFront: d.lateralLoadTransferFront,
    lateralLoadTransferRear: d.lateralLoadTransferRear,
    balanceIndex: d.balanceIndex,
    comfortIndex: d.comfortIndex,
    sportIndex: d.sportIndex,
    transmissibilityPeak: d.transmissibilityPeak,
    pitchGradient: d.pitchGradient,
    wheelLift: d.wheelLift,
    fenderGapFront: d.fitment.fenderGapFront,
    pokeMm: d.fitment.pokeMm,
    speedoErrorPct: d.fitment.speedoErrorPct,
  };
}

/** Static weight, N, on one front corner — used by lessons and the viz. */
export function totalMassKg(p: SuspensionParams): number {
  return p.vehicleMassSprung + 2 * p.unsprungMassFront + 2 * p.unsprungMassRear;
}

export { G };
