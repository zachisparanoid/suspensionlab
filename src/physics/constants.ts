/** Physical constants and reference geometry used across the physics layer. */

/** Gravitational acceleration, m/s². */
export const G = 9.81;

/** Convert N/mm → N/m. */
export const NPMM_TO_NPM = 1000;

/** Convert N·s/mm → N·s/m. */
export const NSPMM_TO_NSPM = 1000;

export const DEG_PER_RAD = 180 / Math.PI;
export const RAD_PER_DEG = Math.PI / 180;

export const MM_PER_INCH = 25.4;

/** Step-response sim: duration and output cap. */
export const STEP_SIM_DURATION_S = 3;
export const STEP_SIM_MAX_POINTS = 400;

/** Road-input sim window. */
export const ROAD_SIM_DURATION_S = 4;
export const ROAD_SIM_MAX_POINTS = 400;

/** Transmissibility sweep: log-spaced points between these frequencies. */
export const TRANSMISSIBILITY_MIN_HZ = 0.2;
export const TRANSMISSIBILITY_MAX_HZ = 30;
export const TRANSMISSIBILITY_POINTS = 200;

/** Fixed integrator step for the 2-DOF sim, s. */
export const SIM_DT = 0.001;

/**
 * Fitment reference ("stock") wheel used for poke / speedo-error deltas:
 * a common OEM-ish 17×7" ET45 fitment.
 */
export const STOCK_WHEEL = {
  diameterIn: 17,
  widthIn: 7,
  offsetMm: 45,
} as const;

/**
 * Fender reference: at the default ride height with the stock tire we assume
 * this much visual gap between tire top and fender lip (mm). Ride-height and
 * tire-diameter changes move the gap 1:1. Schematic, documented in the UI.
 */
export const FENDER_GAP_REFERENCE_MM = 70;
export const FENDER_GAP_REFERENCE_RIDE_HEIGHT_MM = 140;

/** Assumed steering-axis (kingpin) ground intersection vs stock offset for scrub estimates. */
export const SCRUB_PER_OFFSET_MM = 1; // 1 mm offset reduction ≈ 1 mm more positive scrub

/** Numeric guards. */
export const EPS = 1e-9;
export const MAX_DAMPING_RATIO_DISPLAY = 5;
