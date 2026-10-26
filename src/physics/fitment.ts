/**
 * Wheel & tire fitment math for the stance/fitment community.
 * Mostly exact tape-measure geometry; the fender-gap model is schematic
 * (documented reference: 70 mm gap at 140 mm ride height on the stock tire).
 */
import {
  FENDER_GAP_REFERENCE_MM,
  FENDER_GAP_REFERENCE_RIDE_HEIGHT_MM,
  MM_PER_INCH,
  RAD_PER_DEG,
  SCRUB_PER_OFFSET_MM,
  STOCK_WHEEL,
} from './constants';
import type { FitmentStats } from '../types';

export interface FitmentInput {
  wheelDiameterIn: number;
  wheelWidthIn: number;
  wheelOffsetMm: number;
  tireWidthMm: number;
  tireAspectPct: number;
  /** Stock reference loaded radius, mm. */
  tireStaticRadiusMm: number;
  rideHeightFrontMm: number;
  rideHeightRearMm: number;
  camberFrontDeg: number;
}

export function computeFitment(i: FitmentInput): FitmentStats {
  const sidewallHeight = (i.tireWidthMm * i.tireAspectPct) / 100;
  const tireOverallDiameter = i.wheelDiameterIn * MM_PER_INCH + 2 * sidewallHeight;
  const stockDiameter = 2 * i.tireStaticRadiusMm;
  const diameterDeltaVsStock = tireOverallDiameter - stockDiameter;

  // Speedo assumes stock rolling circumference. Bigger tire → fewer revs →
  // speedo under-reads (negative error by the "reads fast" convention).
  const speedoErrorPct =
    stockDiameter > 0 ? ((stockDiameter - tireOverallDiameter) / stockDiameter) * 100 : 0;

  // Wheel face position vs stock: outboard face sits at (width/2 − offset)
  // from the hub face. Positive delta = sticks out further = poke.
  const faceNow = (i.wheelWidthIn * MM_PER_INCH) / 2 - i.wheelOffsetMm;
  const faceStock = (STOCK_WHEEL.widthIn * MM_PER_INCH) / 2 - STOCK_WHEEL.offsetMm;
  const pokeMm = faceNow - faceStock;

  // Negative camber leans the tire top inboard by sin(θ)·(height of fender
  // line ≈ tire diameter) — the classic "camber to clear" trick.
  const camberTuckMm = Math.sin(Math.abs(i.camberFrontDeg) * RAD_PER_DEG) * tireOverallDiameter * Math.sign(-i.camberFrontDeg);

  // Vertical arch gap: reference gap ± ride-height change ∓ tire radius growth.
  const gap = (rideHeight: number) =>
    FENDER_GAP_REFERENCE_MM +
    (rideHeight - FENDER_GAP_REFERENCE_RIDE_HEIGHT_MM) -
    diameterDeltaVsStock / 2;
  const fenderGapFront = gap(i.rideHeightFrontMm);
  const fenderGapRear = gap(i.rideHeightRearMm);

  const stretchFactor =
    i.wheelWidthIn > 0 ? i.tireWidthMm / (i.wheelWidthIn * MM_PER_INCH) : 1;

  // Rub heuristic: vertical gap eaten by poke without camber tuck to save it.
  // Effective clearance = arch gap + camber tuck − poke·0.6 (poke pushes the
  // shoulder toward the lip on compression at ~60% authority, schematic).
  const effective =
    Math.min(fenderGapFront, fenderGapRear) +
    Math.max(camberTuckMm, 0) * 0.5 -
    Math.max(pokeMm, 0) * 0.6;
  const rubRisk: FitmentStats['rubRisk'] =
    effective <= 5 ? 'rubbing' : effective <= 25 ? 'close' : 'clear';

  const scrubRadiusDeltaMm = (STOCK_WHEEL.offsetMm - i.wheelOffsetMm) * SCRUB_PER_OFFSET_MM;

  return {
    tireOverallDiameter,
    sidewallHeight,
    diameterDeltaVsStock,
    speedoErrorPct,
    pokeMm,
    camberTuckMm,
    fenderGapFront,
    fenderGapRear,
    stretchFactor,
    rubRisk,
    scrubRadiusDeltaMm,
  };
}
