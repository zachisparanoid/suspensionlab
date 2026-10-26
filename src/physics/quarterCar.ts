/**
 * 2-DOF quarter-car model.
 *
 *        ┌─────────┐
 *        │  m_s    │  sprung mass (body corner)
 *        └────┬────┘
 *         k_w │ c(v)      wheel-rate spring + asymmetric damper
 *        ┌────┴────┐
 *        │  m_u    │  unsprung mass (wheel/hub)
 *        └────┬────┘
 *         k_t │           tire vertical spring
 *        ─────┴─────  road input z_r(t)
 *
 * All quantities here are SI base units (m, kg, N/m, N·s/m). Callers convert
 * from the app's mm-based storage once, at the boundary.
 */

export interface QuarterCarModel {
  /** Corner sprung mass, kg. */
  ms: number;
  /** Corner unsprung mass, kg. */
  mu: number;
  /** Wheel rate, N/m. */
  kw: number;
  /** Tire vertical rate, N/m. */
  kt: number;
  /** Compression (bump) damping at the wheel, N·s/m. */
  cBump: number;
  /** Rebound damping at the wheel, N·s/m. */
  cRebound: number;
}

export interface QuarterCarState {
  /** Sprung mass displacement from static equilibrium, m. */
  zs: number;
  /** Sprung mass velocity, m/s. */
  vs: number;
  /** Unsprung mass displacement, m. */
  zu: number;
  /** Unsprung mass velocity, m/s. */
  vu: number;
}

export const restState = (): QuarterCarState => ({ zs: 0, vs: 0, zu: 0, vu: 0 });

/**
 * Damper force is asymmetric: real dampers run more rebound than bump.
 * Compression (suspension shortening, vs < vu → relVel > 0 here) uses cBump.
 */
export function damperCoefficient(model: QuarterCarModel, relVel: number): number {
  return relVel >= 0 ? model.cBump : model.cRebound;
}

interface Derivative {
  dzs: number;
  dvs: number;
  dzu: number;
  dvu: number;
}

function derivative(model: QuarterCarModel, s: QuarterCarState, zRoad: number): Derivative {
  const { ms, mu, kw, kt } = model;
  // Suspension deflection rate: positive when compressing (wheel moving toward body).
  const relVel = s.vu - s.vs;
  const c = damperCoefficient(model, relVel);

  const springForce = kw * (s.zu - s.zs); // pushes body up when compressed
  const damperForce = c * relVel;
  const tireForce = kt * (zRoad - s.zu);

  return {
    dzs: s.vs,
    dvs: (springForce + damperForce) / ms,
    dzu: s.vu,
    dvu: (tireForce - springForce - damperForce) / mu,
  };
}

/**
 * One RK4 step. `roadAt` supplies z_r at arbitrary times so mid-step samples
 * stay consistent for smooth inputs.
 */
export function stepRK4(
  model: QuarterCarModel,
  s: QuarterCarState,
  t: number,
  dt: number,
  roadAt: (t: number) => number,
): QuarterCarState {
  const add = (a: QuarterCarState, d: Derivative, h: number): QuarterCarState => ({
    zs: a.zs + d.dzs * h,
    vs: a.vs + d.dvs * h,
    zu: a.zu + d.dzu * h,
    vu: a.vu + d.dvu * h,
  });

  const k1 = derivative(model, s, roadAt(t));
  const k2 = derivative(model, add(s, k1, dt / 2), roadAt(t + dt / 2));
  const k3 = derivative(model, add(s, k2, dt / 2), roadAt(t + dt / 2));
  const k4 = derivative(model, add(s, k3, dt), roadAt(t + dt));

  return {
    zs: s.zs + (dt / 6) * (k1.dzs + 2 * k2.dzs + 2 * k3.dzs + k4.dzs),
    vs: s.vs + (dt / 6) * (k1.dvs + 2 * k2.dvs + 2 * k3.dvs + k4.dvs),
    zu: s.zu + (dt / 6) * (k1.dzu + 2 * k2.dzu + 2 * k3.dzu + k4.dzu),
    vu: s.vu + (dt / 6) * (k1.dvu + 2 * k2.dvu + 2 * k3.dvu + k4.dvu),
  };
}

/**
 * Linear transmissibility |Z_s/Z_r|(f) for the 2-DOF model using the mean
 * damping coefficient (linear analysis needs a symmetric damper).
 *
 * Derived from the coupled equations in the frequency domain:
 *   ms·s²·Zs = (kw + c·s)(Zu − Zs)
 *   mu·s²·Zu = kt(Zr − Zu) − (kw + c·s)(Zu − Zs)
 * with s = jω. Solved for Zs/Zr with complex arithmetic inlined below.
 */
export function transmissibilityAt(model: QuarterCarModel, freqHz: number): number {
  const { ms, mu, kw, kt } = model;
  const c = (model.cBump + model.cRebound) / 2;
  const w = 2 * Math.PI * freqHz;

  // K = kw + jωc (suspension complex stiffness)
  const kRe = kw;
  const kIm = w * c;

  // A = K − ms·ω²  (denominator of Zs = K·Zu / A)
  const aRe = kRe - ms * w * w;
  const aIm = kIm;

  // From the unsprung equation: Zu(−mu·ω² + kt + K − K²/A) = kt·Zr
  // K²:
  const k2Re = kRe * kRe - kIm * kIm;
  const k2Im = 2 * kRe * kIm;
  // K²/A:
  const aMag2 = aRe * aRe + aIm * aIm;
  if (aMag2 === 0) return 0;
  const kaRe = (k2Re * aRe + k2Im * aIm) / aMag2;
  const kaIm = (k2Im * aRe - k2Re * aIm) / aMag2;

  const dRe = kt - mu * w * w + kRe - kaRe;
  const dIm = kIm - kaIm;
  const dMag2 = dRe * dRe + dIm * dIm;
  if (dMag2 === 0) return 0;

  // Zu/Zr = kt / D
  const zuRe = (kt * dRe) / dMag2;
  const zuIm = (-kt * dIm) / dMag2;

  // Zs/Zr = (K/A)·(Zu/Zr)
  const kOverARe = (kRe * aRe + kIm * aIm) / aMag2;
  const kOverAIm = (kIm * aRe - kRe * aIm) / aMag2;

  const zsRe = kOverARe * zuRe - kOverAIm * zuIm;
  const zsIm = kOverARe * zuIm + kOverAIm * zuRe;

  return Math.hypot(zsRe, zsIm);
}
