/**
 * Zod validation for the summary endpoint. Mirrors shared/contract.ts field
 * for field; the `satisfies` clause below makes tsc fail if the two drift.
 */
import { z } from 'zod';
import type { SummaryRequest } from '../../../shared/contract';

const finite = z.number().finite();

const summaryParamsSchema = z.object({
  vehicleMassSprung: finite,
  unsprungMassFront: finite,
  unsprungMassRear: finite,
  weightDistFront: finite,
  wheelbase: finite,
  trackFront: finite,
  trackRear: finite,
  cgHeight: finite,
  rideHeightFront: finite,
  rideHeightRear: finite,
  springRateFront: finite,
  springRateRear: finite,
  motionRatioFront: finite,
  motionRatioRear: finite,
  damperBumpFront: finite,
  damperReboundFront: finite,
  damperBumpRear: finite,
  damperReboundRear: finite,
  arbStiffnessFront: finite,
  arbStiffnessRear: finite,
  tireStiffnessFront: finite,
  tireStiffnessRear: finite,
  tireStaticRadius: finite,
  camberFront: finite,
  camberRear: finite,
  antiDive: finite,
  antiSquat: finite,
  rollCenterHeightFront: finite,
  rollCenterHeightRear: finite,
  wheelDiameterIn: finite,
  wheelWidthIn: finite,
  wheelOffsetMm: finite,
  tireWidthMm: finite,
  tireAspectPct: finite,
  lateralG: finite,
  longitudinalG: finite,
  roadInput: z.enum(['step', 'bump', 'pothole', 'sine']),
  sineFreqHz: finite,
  amplitudeMm: finite,
  vehicleSpeed: finite,
});

const summaryDerivedSchema = z.object({
  wheelRateFront: finite,
  wheelRateRear: finite,
  rideFrequencyFront: finite,
  rideFrequencyRear: finite,
  frequencySplit: finite,
  dampingRatioFront: finite,
  dampingRatioRear: finite,
  rollGradient: finite,
  rollStiffnessDistFront: finite,
  totalRollStiffness: finite,
  lateralLoadTransferFront: finite,
  lateralLoadTransferRear: finite,
  balanceIndex: finite,
  comfortIndex: finite,
  sportIndex: finite,
  transmissibilityPeak: finite,
  pitchGradient: finite,
  wheelLift: z.boolean(),
  fenderGapFront: finite,
  pokeMm: finite,
  speedoErrorPct: finite,
});

const summaryRequestSchema = z.object({
  params: summaryParamsSchema,
  derived: summaryDerivedSchema,
  presetName: z.string().max(64).optional(),
  units: z.enum(['si', 'imperial']),
  focus: z.enum(['overview', 'handling', 'comfort', 'tradeoffs', 'stance']).optional(),
  compare: z
    .object({
      params: summaryParamsSchema,
      derived: summaryDerivedSchema,
    })
    .optional(),
}) satisfies z.ZodType<SummaryRequest>;

/** Parse an unknown request body into a SummaryRequest, throwing ZodError on failure. */
export function parseSummaryRequest(body: unknown): SummaryRequest {
  return summaryRequestSchema.parse(body);
}
