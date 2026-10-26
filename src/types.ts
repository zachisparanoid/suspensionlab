/**
 * Core domain types for SuspensionLab.
 *
 * Everything is stored internally in SI units:
 *   mass kg · length mm · stiffness N/mm · damping N·s/mm ·
 *   roll stiffness N·m/deg · frequency Hz · angles deg · speed km/h
 * Display conversion happens exclusively in `units/convert.ts`.
 */

export type RoadInputType = 'step' | 'bump' | 'pothole' | 'sine';
export type UnitSystem = 'si' | 'imperial';
export type ThemeMode = 'dark' | 'light';
export type SummaryFocus = 'overview' | 'handling' | 'comfort' | 'tradeoffs' | 'stance';

/** The live, user-editable state of the virtual car. */
export interface SuspensionParams {
  // ── Mass & layout ────────────────────────────────────────────────
  /** Sprung (body) mass, kg. */
  vehicleMassSprung: number;
  /** Unsprung mass per front corner (wheel/hub/brake/half-arm), kg. */
  unsprungMassFront: number;
  /** Unsprung mass per rear corner, kg. */
  unsprungMassRear: number;
  /** Static weight on the front axle, % of total. */
  weightDistFront: number;
  /** Wheelbase, mm. */
  wheelbase: number;
  /** Front track width, mm. */
  trackFront: number;
  /** Rear track width, mm. */
  trackRear: number;
  /** Centre-of-gravity height above ground, mm. */
  cgHeight: number;
  /** Front ride height (chassis reference to ground), mm. */
  rideHeightFront: number;
  /** Rear ride height, mm. */
  rideHeightRear: number;

  // ── Springs ──────────────────────────────────────────────────────
  /** Front spring installed rate, N/mm. */
  springRateFront: number;
  /** Rear spring installed rate, N/mm. */
  springRateRear: number;
  /** Front motion ratio (spring travel per unit wheel travel). Wheel rate = k·MR². */
  motionRatioFront: number;
  /** Rear motion ratio. */
  motionRatioRear: number;

  // ── Dampers ──────────────────────────────────────────────────────
  /** Front compression (bump) damping coefficient, N·s/mm. */
  damperBumpFront: number;
  /** Front rebound damping coefficient, N·s/mm. */
  damperReboundFront: number;
  damperBumpRear: number;
  damperReboundRear: number;

  // ── Anti-roll bars ───────────────────────────────────────────────
  /** Front ARB roll stiffness measured at the wheels, N·m/deg. 0 = no bar. */
  arbStiffnessFront: number;
  arbStiffnessRear: number;

  // ── Tires ────────────────────────────────────────────────────────
  /** Vertical tire spring rate, front, N/mm. */
  tireStiffnessFront: number;
  tireStiffnessRear: number;
  /** Loaded static radius of the reference (stock) tire, mm. */
  tireStaticRadius: number;

  // ── Geometry ─────────────────────────────────────────────────────
  /** Static camber, deg (negative = top of tire leaning inboard). */
  camberFront: number;
  camberRear: number;
  /** Anti-dive, % of braking pitch moment reacted through geometry. */
  antiDive: number;
  /** Anti-squat, % of acceleration pitch moment reacted through geometry. */
  antiSquat: number;
  /** Front roll-center height above ground, mm (can be negative). */
  rollCenterHeightFront: number;
  rollCenterHeightRear: number;

  // ── Wheels & fitment (stance) ────────────────────────────────────
  /** Wheel diameter, inches (industry-standard unit even in SI mode). */
  wheelDiameterIn: number;
  /** Wheel width, inches. */
  wheelWidthIn: number;
  /** Wheel offset (ET), mm. Positive = wheel face outboard of centreline moves inward. */
  wheelOffsetMm: number;
  /** Tire section width, mm. */
  tireWidthMm: number;
  /** Tire aspect ratio, % of section width. */
  tireAspectPct: number;

  // ── Scenario inputs (what we simulate, not the car itself) ───────
  /** Cornering scenario, lateral acceleration in g. */
  lateralG: number;
  /** Braking (negative) / acceleration (positive) scenario, g. */
  longitudinalG: number;
  /** Road excitation type for the quarter-car sim. */
  roadInput: RoadInputType;
  /** Sine-input frequency, Hz. */
  sineFreqHz: number;
  /** Road-input amplitude, mm. */
  amplitudeMm: number;
  /** Vehicle speed for road-input timing, km/h. */
  vehicleSpeed: number;
}

export type ParamKey = keyof SuspensionParams;

/** One (x, y) sample for charts. */
export interface SeriesPoint {
  x: number;
  y: number;
  /** Optional second series value (e.g. unsprung mass or road input). */
  y2?: number;
  y3?: number;
}

export interface CornerLoads {
  fl: number;
  fr: number;
  rl: number;
  rr: number;
}

export type DampingBand = 'underdamped' | 'sporty' | 'critical' | 'overdamped';

export interface AxleStats {
  /** Wheel rate (spring at the wheel), N/mm. */
  wheelRate: number;
  /** Ride rate (wheel rate in series with tire), N/mm. */
  rideRate: number;
  /** Sprung natural (ride) frequency, Hz. */
  rideFrequency: number;
  /** Mean damping ratio ζ (bump/rebound averaged). */
  dampingRatio: number;
  dampingRatioBump: number;
  dampingRatioRebound: number;
  /** Critical damping reference at the wheel, N·s/mm. */
  criticalDamping: number;
  /** Roll stiffness incl. springs + ARB, N·m/deg. */
  rollStiffness: number;
  /** Spring-only share of that roll stiffness, N·m/deg. */
  rollStiffnessSprings: number;
  /** Wheel-hop (unsprung) natural frequency, Hz. */
  unsprungFrequency: number;
  /** Corner sprung mass used in the math, kg. */
  cornerSprungMass: number;
}

/** Fitment-oriented derived values (stance community feature). */
export interface FitmentStats {
  /** Overall tire diameter from wheel size + tire spec, mm. */
  tireOverallDiameter: number;
  /** Sidewall height, mm. */
  sidewallHeight: number;
  /** Diameter delta vs the reference/stock tire (2 × tireStaticRadius), mm. */
  diameterDeltaVsStock: number;
  /** Speedometer error, % (positive = speedo reads fast / actual slower). */
  speedoErrorPct: number;
  /** How far the wheel face pokes past the stock reference position, mm. Positive = poke. */
  pokeMm: number;
  /** Lateral gain of the tire's outer edge at the fender line from camber, mm (negative camber tucks the top). */
  camberTuckMm: number;
  /** Estimated fender-to-tire gap at the front arch, mm. */
  fenderGapFront: number;
  /** Estimated fender-to-tire gap at the rear arch, mm. */
  fenderGapRear: number;
  /** Tire stretch factor: section width vs wheel width (1 = square, <1 = stretched). */
  stretchFactor: number;
  /** Qualitative rub risk assessment. */
  rubRisk: 'clear' | 'close' | 'rubbing';
  /** Approximate scrub-radius change vs stock offset, mm. */
  scrubRadiusDeltaMm: number;
}

/** Everything `physics/derive.ts` computes from `SuspensionParams`. */
export interface DerivedStats {
  front: AxleStats;
  rear: AxleStats;

  // Flat aliases used by stat cards / the AI contract.
  wheelRateFront: number;
  wheelRateRear: number;
  rideFrequencyFront: number;
  rideFrequencyRear: number;
  /** Rear/front ride-frequency ratio (flat-ride indicator, ~1.05–1.20 classic). */
  frequencySplit: number;
  dampingRatioFront: number;
  dampingRatioRear: number;
  dampingBandFront: DampingBand;
  dampingBandRear: DampingBand;
  criticalDampingFront: number;
  criticalDampingRear: number;
  rollStiffnessFront: number;
  rollStiffnessRear: number;
  totalRollStiffness: number;
  /** Body roll per lateral g, deg/g. */
  rollGradient: number;
  /** Front share of total roll stiffness, %. */
  rollStiffnessDistFront: number;
  /** Front share of total lateral load transfer, % (incl. geometric + unsprung paths). */
  lltdFront: number;
  /** Lateral load transfer at the current lateralG, N per axle (inner→outer). */
  lateralLoadTransferFront: number;
  lateralLoadTransferRear: number;
  /** Longitudinal load transfer at current longitudinalG, N per axle pair. */
  longitudinalLoadTransfer: number;
  staticCornerLoads: CornerLoads;
  dynamicCornerLoads: CornerLoads;
  /** True when any dynamic corner load has hit zero. */
  wheelLift: boolean;
  /** Which corners lifted. */
  liftedCorners: Array<keyof CornerLoads>;
  /** Body pitch per longitudinal g (braking, incl. anti-dive/squat relief), deg/g. */
  pitchGradient: number;
  /** Peak transmissibility gain at the sprung resonance. */
  transmissibilityPeak: number;
  /** Frequency above which road inputs are attenuated (gain < 1), Hz. */
  isolationAboveHz: number;
  unsprungFrequencyFront: number;
  unsprungFrequencyRear: number;
  /** −100 (understeer-biased) … +100 (oversteer-biased). */
  balanceIndex: number;
  /** 0–100 heuristic comfort score (documented in statMeta). */
  comfortIndex: number;
  /** 0–100 heuristic sport/track score. */
  sportIndex: number;

  fitment: FitmentStats;

  // Chart series (computed slightly throttled; capped lengths).
  /** Sprung-mass displacement vs time after a step, 0–3 s, ≤400 pts. y2 = unsprung. */
  stepResponseSeries: SeriesPoint[];
  /** |sprung / road| gain vs frequency, log-spaced 0.2–30 Hz, ≤200 pts. */
  transmissibilitySeries: SeriesPoint[];
  /** Response to the currently selected road input. y = sprung, y2 = unsprung, y3 = road. */
  roadResponseSeries: SeriesPoint[];

  /** True when inputs were degenerate and stats are the last valid set. */
  degenerate: boolean;
  /** Human-readable notes about guards that fired (degenerate inputs etc.). */
  warnings: string[];
}

/** Trimmed numeric subset sent to the AI (no chart arrays). */
export interface DerivedStatsSummary {
  wheelRateFront: number;
  wheelRateRear: number;
  rideFrequencyFront: number;
  rideFrequencyRear: number;
  frequencySplit: number;
  dampingRatioFront: number;
  dampingRatioRear: number;
  rollGradient: number;
  rollStiffnessDistFront: number;
  totalRollStiffness: number;
  lateralLoadTransferFront: number;
  lateralLoadTransferRear: number;
  balanceIndex: number;
  comfortIndex: number;
  sportIndex: number;
  transmissibilityPeak: number;
  pitchGradient: number;
  wheelLift: boolean;
  fenderGapFront: number;
  pokeMm: number;
  speedoErrorPct: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  /** lucide-react icon name rendered by PresetPicker. */
  icon: string;
  params: SuspensionParams;
  tags: string[];
}

export interface Snapshot {
  id: string;
  label: 'A';
  params: SuspensionParams;
  derived: DerivedStats;
  takenAt: number;
}

export interface SavedConfig {
  id: string;
  name: string;
  params: SuspensionParams;
  createdAt: number;
  updatedAt: number;
}

// ── Parameter metadata ─────────────────────────────────────────────
export type ParamCategory =
  | 'mass'
  | 'springs'
  | 'dampers'
  | 'arb'
  | 'tires'
  | 'geometry'
  | 'fitment'
  | 'scenario';

export interface ParamMeta {
  key: ParamKey;
  label: string;
  /** SI display unit ('' for dimensionless). */
  unit: string;
  min: number;
  max: number;
  step: number;
  category: ParamCategory;
  /** Plain-English physics explanation shown in the tooltip. */
  help: string;
  /** Hidden behind the per-group "Advanced" reveal. */
  advanced?: boolean;
  /** Decimal places for display. */
  decimals?: number;
}

// ── Stat metadata ──────────────────────────────────────────────────
export type StatDirection = 'higherBetter' | 'lowerBetter' | 'neutral';

export interface StatBand {
  /** Upper bound of this band (inclusive); bands are evaluated in order. */
  upTo: number;
  label: string;
  /** Semantic color token: accent2 (soft/comfort), accent, warn (stiff/sport), danger. */
  tone: 'accent2' | 'accent' | 'warn' | 'danger' | 'neutral';
}

export interface StatMeta {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  tooltip: string;
  bands?: StatBand[];
  /** Whether a delta vs snapshot A has a good/bad direction, for coloring. */
  direction: StatDirection;
  group: 'ride' | 'roll' | 'loads' | 'balance' | 'fitment';
}

// ── Lessons ────────────────────────────────────────────────────────
export interface LessonStepDef {
  title: string;
  /** Markdown-ish body text (bold + paragraphs supported). */
  body: string;
  /** Live checkpoint the learner must satisfy; omit for read-only steps. */
  checkpoint?: {
    description: string;
    predicate: (params: SuspensionParams, derived: DerivedStats) => boolean;
  };
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  /** Preset id to load when the lesson starts (keeps checkpoints reachable). */
  startPresetId?: string;
  steps: LessonStepDef[];
}
