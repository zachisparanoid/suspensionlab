/**
 * Ride-domain math: wheel rate, ride rate, ride frequency, damping ratio.
 * Inputs in app storage units (N/mm, kg); outputs documented per function.
 */
import { EPS, MAX_DAMPING_RATIO_DISPLAY, NPMM_TO_NPM, NSPMM_TO_NSPM } from './constants';
import type { DampingBand } from '../types';

/**
 * Wheel rate from spring rate and motion ratio, N/mm.
 * MR = spring travel / wheel travel, so the spring "sees" MR× the wheel's
 * movement and pushes back through the same leverage → k_wheel = k_spring·MR².
 */
export function wheelRate(springRateNpmm: number, motionRatio: number): number {
  return springRateNpmm * motionRatio * motionRatio;
}

/** Ride rate: wheel rate in series with the tire spring, N/mm. */
export function rideRate(wheelRateNpmm: number, tireRateNpmm: number): number {
  const denom = wheelRateNpmm + tireRateNpmm;
  if (denom < EPS) return 0;
  return (wheelRateNpmm * tireRateNpmm) / denom;
}

/**
 * Sprung natural frequency, Hz: f = (1/2π)·√(k_ride / m_s).
 * Uses ride rate (tire included) — the frequency a passenger actually feels.
 */
export function rideFrequency(rideRateNpmm: number, cornerSprungMassKg: number): number {
  if (cornerSprungMassKg < EPS || rideRateNpmm < EPS) return 0;
  return Math.sqrt((rideRateNpmm * NPMM_TO_NPM) / cornerSprungMassKg) / (2 * Math.PI);
}

/**
 * Critical damping reference at the wheel, N·s/mm:
 * c_crit = 2·√(k_wheel · m_s), the damping that returns the body to rest
 * fastest with zero overshoot.
 */
export function criticalDamping(wheelRateNpmm: number, cornerSprungMassKg: number): number {
  if (cornerSprungMassKg < EPS || wheelRateNpmm < EPS) return 0;
  return (2 * Math.sqrt(wheelRateNpmm * NPMM_TO_NPM * cornerSprungMassKg)) / NSPMM_TO_NSPM;
}

/**
 * Damping ratio ζ = c_wheel / c_crit.
 * The damper coefficient acts through the motion ratio squared, same as the spring.
 */
export function dampingRatio(
  damperNspmm: number,
  motionRatio: number,
  wheelRateNpmm: number,
  cornerSprungMassKg: number,
): number {
  const cCrit = criticalDamping(wheelRateNpmm, cornerSprungMassKg);
  if (cCrit < EPS) return 0;
  const cWheel = damperNspmm * motionRatio * motionRatio;
  return Math.min(cWheel / cCrit, MAX_DAMPING_RATIO_DISPLAY);
}

export function dampingBand(zeta: number): DampingBand {
  if (zeta < 0.5) return 'underdamped';
  if (zeta < 0.85) return 'sporty';
  if (zeta <= 1.1) return 'critical';
  return 'overdamped';
}

/**
 * Wheel-hop (unsprung) natural frequency, Hz. The wheel bounces between the
 * spring above and the tire below: f = (1/2π)·√((k_w + k_t)/m_u).
 */
export function unsprungFrequency(
  wheelRateNpmm: number,
  tireRateNpmm: number,
  unsprungMassKg: number,
): number {
  if (unsprungMassKg < EPS) return 0;
  return (
    Math.sqrt(((wheelRateNpmm + tireRateNpmm) * NPMM_TO_NPM) / unsprungMassKg) / (2 * Math.PI)
  );
}
