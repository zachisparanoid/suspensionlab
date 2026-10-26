/**
 * Schematic geometry effects: pitch stiffness/gradient with anti-dive and
 * anti-squat relief. Deliberately simplified but directionally correct.
 */
import { DEG_PER_RAD, EPS, G, NPMM_TO_NPM, RAD_PER_DEG } from './constants';

/**
 * Pitch stiffness about the CG from the four wheel rates, N·m/deg.
 * K_θ = 2·k_F·a² + 2·k_R·b² (a, b = CG→axle distances, m; k per wheel, N/m).
 */
export function pitchStiffness(
  wheelRateFrontNpmm: number,
  wheelRateRearNpmm: number,
  cgFromFrontMm: number,
  wheelbaseMm: number,
): number {
  const a = cgFromFrontMm / 1000;
  const b = (wheelbaseMm - cgFromFrontMm) / 1000;
  const kF = wheelRateFrontNpmm * NPMM_TO_NPM;
  const kR = wheelRateRearNpmm * NPMM_TO_NPM;
  return (2 * kF * a * a + 2 * kR * b * b) * RAD_PER_DEG;
}

/**
 * Pitch gradient, deg/g of longitudinal acceleration.
 *
 * Base gradient is m_s·g·h_cg / K_θ. Anti-dive geometry reacts part of the
 * braking pitch moment through the suspension links instead of the springs,
 * so the *suspension-deflection* pitch shrinks by the anti percentage on the
 * axle doing the work. We report the braking case (the one learners feel most)
 * with anti-dive relieving the front's contribution and anti-squat the rear's.
 */
export function pitchGradient(
  sprungMassKg: number,
  cgHeightMm: number,
  pitchStiffnessNmPerDeg: number,
  antiDivePct: number,
  antiSquatPct: number,
): number {
  if (pitchStiffnessNmPerDeg < EPS) return 0;
  const momentPerG = sprungMassKg * G * (cgHeightMm / 1000); // N·m per g
  const base = momentPerG / (pitchStiffnessNmPerDeg * DEG_PER_RAD); // rad/g
  // Braking: front dives (anti-dive relieves it), rear lifts (anti-squat/lift
  // geometry relieves that too). Average the two axle reliefs.
  const relief = 1 - (antiDivePct / 100 + antiSquatPct / 100) / 2;
  return base * Math.max(relief, 0.05) * DEG_PER_RAD;
}

/**
 * Camber of the outer wheel under body roll, deg. With no camber-recovery
 * modeled, the wheel leans with the body: dynamic camber = static + roll.
 * (Positive roll makes the outer wheel go toward positive camber — bad.)
 */
export function dynamicOuterCamber(staticCamberDeg: number, bodyRollDeg: number): number {
  return staticCamberDeg + bodyRollDeg;
}
