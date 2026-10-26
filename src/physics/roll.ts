/**
 * Roll-domain math: axle roll stiffness (springs + ARB), roll gradient,
 * roll-axis geometry.
 */
import { DEG_PER_RAD, EPS, G, NPMM_TO_NPM, RAD_PER_DEG } from './constants';

/**
 * Roll stiffness contributed by an axle's two springs, N·m/deg.
 * For small roll φ each wheel moves ±(t/2)·φ, so the restoring moment is
 * K_φ = k_wheel·t²/2 (k in N/m, t in m, result N·m/rad) → convert to per-degree.
 */
export function springRollStiffness(wheelRateNpmm: number, trackMm: number): number {
  const kw = wheelRateNpmm * NPMM_TO_NPM; // N/m per wheel
  const t = trackMm / 1000; // m
  return ((kw * t * t) / 2) * RAD_PER_DEG;
}

/** Total axle roll stiffness = springs + ARB (ARB entered directly in N·m/deg). */
export function axleRollStiffness(
  wheelRateNpmm: number,
  trackMm: number,
  arbNmPerDeg: number,
): number {
  return springRollStiffness(wheelRateNpmm, trackMm) + arbNmPerDeg;
}

/**
 * Roll-axis height at the CG's longitudinal position, mm.
 * The roll axis joins front and rear roll centers; the body rolls about it.
 * `cgFromFrontMm` = distance from front axle to CG.
 */
export function rollAxisHeightAtCg(
  rcFrontMm: number,
  rcRearMm: number,
  cgFromFrontMm: number,
  wheelbaseMm: number,
): number {
  if (wheelbaseMm < EPS) return rcFrontMm;
  return rcFrontMm + ((rcRearMm - rcFrontMm) * cgFromFrontMm) / wheelbaseMm;
}

/**
 * Roll gradient, deg/g.
 * The sprung mass hangs `hArm` above the roll axis; 1 g of lateral force makes
 * moment m_s·g·hArm, resisted by total roll stiffness minus the destabilising
 * gravity term (the leaned body's weight keeps pulling it over):
 *   φ/a_y = m_s·g·h / (K_total − m_s·g·h)   [rad/g, K in N·m/rad]
 */
export function rollGradient(
  sprungMassKg: number,
  rollMomentArmMm: number,
  totalRollStiffnessNmPerDeg: number,
): number {
  const h = Math.max(rollMomentArmMm, 0) / 1000; // negative arm → treat as 0 (RC above CG)
  const kTotal = totalRollStiffnessNmPerDeg * DEG_PER_RAD; // N·m/rad
  const moment = sprungMassKg * G * h; // N·m per g
  const denom = kTotal - moment;
  if (denom < EPS) return 90; // effectively falling over; clamp for display
  return (moment / denom) * DEG_PER_RAD;
}
