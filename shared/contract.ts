/**
 * Request/response contract for the summary endpoint, shared verbatim by
 * client (`@shared/contract`) and server. Keep this file dependency-free.
 */

export type SummaryFocus = 'overview' | 'handling' | 'comfort' | 'tradeoffs' | 'stance';
export type UnitSystem = 'si' | 'imperial';

/**
 * Numeric snapshot of the setup. Field names mirror src/types.ts but are
 * duplicated here so the server never imports frontend code.
 */
export interface SummaryParams {
  vehicleMassSprung: number;
  unsprungMassFront: number;
  unsprungMassRear: number;
  weightDistFront: number;
  wheelbase: number;
  trackFront: number;
  trackRear: number;
  cgHeight: number;
  rideHeightFront: number;
  rideHeightRear: number;
  springRateFront: number;
  springRateRear: number;
  motionRatioFront: number;
  motionRatioRear: number;
  damperBumpFront: number;
  damperReboundFront: number;
  damperBumpRear: number;
  damperReboundRear: number;
  arbStiffnessFront: number;
  arbStiffnessRear: number;
  tireStiffnessFront: number;
  tireStiffnessRear: number;
  tireStaticRadius: number;
  camberFront: number;
  camberRear: number;
  antiDive: number;
  antiSquat: number;
  rollCenterHeightFront: number;
  rollCenterHeightRear: number;
  wheelDiameterIn: number;
  wheelWidthIn: number;
  wheelOffsetMm: number;
  tireWidthMm: number;
  tireAspectPct: number;
  lateralG: number;
  longitudinalG: number;
  roadInput: 'step' | 'bump' | 'pothole' | 'sine';
  sineFreqHz: number;
  amplitudeMm: number;
  vehicleSpeed: number;
}

export interface SummaryDerived {
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

export interface SummaryRequest {
  params: SummaryParams;
  derived: SummaryDerived;
  presetName?: string;
  units: UnitSystem;
  focus?: SummaryFocus;
  /** Present in compare mode: the frozen Snapshot A for a "what changed" section. */
  compare?: {
    params: SummaryParams;
    derived: SummaryDerived;
  };
}

export interface SummaryResponse {
  summary: string;
  cached: boolean;
  promptUsed: string;
  model: 'claude-code-local';
  tookMs: number;
}

export type SummaryErrorCode = 'CLAUDE_NOT_FOUND' | 'TIMEOUT' | 'CLAUDE_ERROR' | 'BAD_REQUEST';

export interface SummaryError {
  error: string;
  code: SummaryErrorCode;
}

export const SUMMARY_ENDPOINT = '/api/summary';
export const HEALTH_ENDPOINT = '/api/health';

export interface HealthResponse {
  ok: boolean;
  claudeAvailable: boolean;
  version: string;
}
