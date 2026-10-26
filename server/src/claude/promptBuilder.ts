/**
 * Deterministic prompt construction for the Claude Code CLI.
 *
 * Prompt-injection safe by construction: every interpolated value is a typed
 * number, boolean, or closed enum from the validated request. The only
 * free-form string (presetName) is sanitized to [a-zA-Z0-9 _-] first.
 */
import { createHash } from 'node:crypto';
import type {
  SummaryDerived,
  SummaryFocus,
  SummaryParams,
  SummaryRequest,
} from '../../../shared/contract';

// --- unit conversion helpers ------------------------------------------------

const KG_TO_LB = 2.20462;
const NMM_TO_LBIN = 5.71015;
const NM_TO_FTLB = 0.737562;
const MM_TO_IN = 1 / 25.4;
const KMH_TO_MPH = 0.621371;
const N_TO_LBF = 0.224809;

function fmt(value: number, digits: number): string {
  return value.toFixed(digits);
}

function mass(kg: number, imperial: boolean): string {
  return imperial ? `${fmt(kg * KG_TO_LB, 1)} lb` : `${fmt(kg, 1)} kg`;
}

function springRate(nPerMm: number, imperial: boolean): string {
  return imperial ? `${fmt(nPerMm * NMM_TO_LBIN, 1)} lb/in` : `${fmt(nPerMm, 1)} N/mm`;
}

function rollRate(nmPerDeg: number, imperial: boolean): string {
  return imperial ? `${fmt(nmPerDeg * NM_TO_FTLB, 1)} ft-lb/deg` : `${fmt(nmPerDeg, 1)} Nm/deg`;
}

function length(mm: number, imperial: boolean): string {
  return imperial ? `${fmt(mm * MM_TO_IN, 2)} in` : `${fmt(mm, 1)} mm`;
}

function speed(kmh: number, imperial: boolean): string {
  return imperial ? `${fmt(kmh * KMH_TO_MPH, 1)} mph` : `${fmt(kmh, 1)} km/h`;
}

function force(n: number, imperial: boolean): string {
  return imperial ? `${fmt(n * N_TO_LBF, 0)} lbf` : `${fmt(n, 0)} N`;
}

// --- prompt assembly ---------------------------------------------------------

function sanitizePresetName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 64);
}

function setupBlock(p: SummaryParams, d: SummaryDerived, imperial: boolean): string[] {
  const wheelWidthMm = p.wheelWidthIn * 25.4;
  const stretchDeltaMm = p.tireWidthMm - wheelWidthMm;
  const stretchNote =
    stretchDeltaMm < 0
      ? `tire section is ${length(Math.abs(stretchDeltaMm), imperial)} narrower than the wheel (stretched fitment)`
      : `tire section is ${length(stretchDeltaMm, imperial)} wider than the wheel (no stretch)`;

  return [
    'CHASSIS',
    `- sprung mass: ${mass(p.vehicleMassSprung, imperial)} | unsprung mass F/R: ${mass(p.unsprungMassFront, imperial)} / ${mass(p.unsprungMassRear, imperial)}`,
    `- weight distribution: ${fmt(p.weightDistFront, 1)}% front`,
    `- wheelbase: ${length(p.wheelbase, imperial)} | track F/R: ${length(p.trackFront, imperial)} / ${length(p.trackRear, imperial)}`,
    `- CG height: ${length(p.cgHeight, imperial)} | ride height F/R: ${length(p.rideHeightFront, imperial)} / ${length(p.rideHeightRear, imperial)}`,
    '',
    'SPRINGS, DAMPERS, BARS',
    `- spring rate F/R: ${springRate(p.springRateFront, imperial)} / ${springRate(p.springRateRear, imperial)}`,
    `- motion ratio F/R: ${fmt(p.motionRatioFront, 2)} / ${fmt(p.motionRatioRear, 2)}`,
    `- wheel rate F/R: ${springRate(d.wheelRateFront, imperial)} / ${springRate(d.wheelRateRear, imperial)}`,
    `- damper bump F/R: ${fmt(p.damperBumpFront, 1)} / ${fmt(p.damperBumpRear, 1)} N·s/mm | rebound F/R: ${fmt(p.damperReboundFront, 1)} / ${fmt(p.damperReboundRear, 1)} N·s/mm`,
    `- anti-roll bar stiffness F/R: ${rollRate(p.arbStiffnessFront, imperial)} / ${rollRate(p.arbStiffnessRear, imperial)}`,
    `- tire vertical stiffness F/R: ${springRate(p.tireStiffnessFront, imperial)} / ${springRate(p.tireStiffnessRear, imperial)}`,
    '',
    'GEOMETRY & ALIGNMENT',
    `- camber F/R: ${fmt(p.camberFront, 1)} deg / ${fmt(p.camberRear, 1)} deg`,
    `- anti-dive: ${fmt(p.antiDive, 0)}% | anti-squat: ${fmt(p.antiSquat, 0)}%`,
    `- roll center height F/R: ${length(p.rollCenterHeightFront, imperial)} / ${length(p.rollCenterHeightRear, imperial)}`,
    `- tire static radius: ${length(p.tireStaticRadius, imperial)}`,
    '',
    'SCENARIO',
    `- lateral: ${fmt(p.lateralG, 2)} g | longitudinal: ${fmt(p.longitudinalG, 2)} g`,
    `- road input: ${p.roadInput} | sine frequency: ${fmt(p.sineFreqHz, 1)} Hz | amplitude: ${length(p.amplitudeMm, imperial)}`,
    `- vehicle speed: ${speed(p.vehicleSpeed, imperial)}`,
    '',
    'DERIVED STATS',
    `- ride frequency F/R: ${fmt(d.rideFrequencyFront, 2)} / ${fmt(d.rideFrequencyRear, 2)} Hz (split ${fmt(d.frequencySplit, 2)} Hz)`,
    `- damping ratio F/R: ${fmt(d.dampingRatioFront, 2)} / ${fmt(d.dampingRatioRear, 2)}`,
    `- roll gradient: ${fmt(d.rollGradient, 2)} deg/g | pitch gradient: ${fmt(d.pitchGradient, 2)} deg/g`,
    `- roll stiffness distribution: ${fmt(d.rollStiffnessDistFront, 1)}% front (total ${rollRate(d.totalRollStiffness, imperial)})`,
    `- lateral load transfer F/R: ${force(d.lateralLoadTransferFront, imperial)} / ${force(d.lateralLoadTransferRear, imperial)}`,
    `- balance index: ${fmt(d.balanceIndex, 2)} | comfort index: ${fmt(d.comfortIndex, 1)} | sport index: ${fmt(d.sportIndex, 1)}`,
    `- transmissibility peak: ${fmt(d.transmissibilityPeak, 2)}`,
    `- inside wheel lift: ${d.wheelLift ? 'yes' : 'no'}`,
    '',
    'FITMENT',
    `- wheel: ${fmt(p.wheelWidthIn, 1)}x${fmt(p.wheelDiameterIn, 0)} ET${fmt(p.wheelOffsetMm, 0)}`,
    `- tire: ${fmt(p.tireWidthMm, 0)}/${fmt(p.tireAspectPct, 0)}R${fmt(p.wheelDiameterIn, 0)}`,
    `- poke: ${length(d.pokeMm, imperial)} | fender gap front: ${length(d.fenderGapFront, imperial)}`,
    `- speedo error: ${fmt(d.speedoErrorPct, 1)}%`,
    `- stretch: ${stretchNote}`,
  ];
}

function compareBlock(d: SummaryDerived, imperial: boolean): string[] {
  return [
    '',
    'PREVIOUS SETUP (A)',
    `- ride frequency F/R: ${fmt(d.rideFrequencyFront, 2)} / ${fmt(d.rideFrequencyRear, 2)} Hz (split ${fmt(d.frequencySplit, 2)} Hz)`,
    `- damping ratio F/R: ${fmt(d.dampingRatioFront, 2)} / ${fmt(d.dampingRatioRear, 2)}`,
    `- roll gradient: ${fmt(d.rollGradient, 2)} deg/g | roll stiffness distribution: ${fmt(d.rollStiffnessDistFront, 1)}% front`,
    `- balance index: ${fmt(d.balanceIndex, 2)} | comfort index: ${fmt(d.comfortIndex, 1)} | sport index: ${fmt(d.sportIndex, 1)}`,
    `- poke: ${length(d.pokeMm, imperial)} | fender gap front: ${length(d.fenderGapFront, imperial)} | speedo error: ${fmt(d.speedoErrorPct, 1)}%`,
    `- inside wheel lift: ${d.wheelLift ? 'yes' : 'no'}`,
    'Dedicate a short section to what changed from setup A to the current setup and the effects of those changes.',
  ];
}

const FOCUS_NOTES: Record<SummaryFocus, string> = {
  overview: 'FOCUS: Give a balanced overview across ride comfort, handling, and stance.',
  handling:
    'FOCUS: Emphasize handling — front/rear balance, roll stiffness distribution, and lateral load transfer. Explain what the split means for understeer vs oversteer at the limit.',
  comfort:
    'FOCUS: Emphasize comfort — ride frequencies, damping ratios, road isolation, and the transmissibility peak. Explain how the setup filters (or fails to filter) the road.',
  tradeoffs:
    'FOCUS: Spend most of your words on the tensions between the choices in this setup — what each aggressive value buys and what it costs elsewhere.',
  stance:
    "FOCUS: Emphasize fitment — poke, fender gap, stretch, camber, and speedo error — and the look-vs-function tension. Speak the fitment community's language (flush, tucked, aired-out) while staying technically grounded.",
};

/** Build the full prompt sent to the Claude Code CLI. Deterministic per request. */
export function buildPrompt(req: SummaryRequest): string {
  const imperial = req.units === 'imperial';
  const lines: string[] = [
    'You are a veteran race engineer explaining a suspension setup to a curious learner. Be warm but precise. No fluff.',
    '',
    'CURRENT SETUP',
  ];

  if (req.presetName !== undefined) {
    const preset = sanitizePresetName(req.presetName);
    if (preset.length > 0) {
      lines.push(`- preset: ${preset}`);
    }
  }
  lines.push(`- units: ${imperial ? 'imperial' : 'SI (metric)'}`);
  lines.push('');
  lines.push(...setupBlock(req.params, req.derived, imperial));

  if (req.compare !== undefined) {
    lines.push(...compareBlock(req.compare.derived, imperial));
  }

  lines.push(
    '',
    'INSTRUCTIONS',
    'Write plain English for the learner, 150-260 words.',
    '- Name the 2-3 most consequential values in this setup and why they matter.',
    '- Describe the resulting ride and handling character.',
    '- Call out one tradeoff the learner just made.',
    '- End with one concrete suggestion of the form "try changing X".',
    '- No preamble and no signoff.',
    '- Light markdown is allowed: bold for emphasis and at most one bullet list.',
    '',
    FOCUS_NOTES[req.focus ?? 'overview'],
  );

  return lines.join('\n');
}

// --- request hashing ----------------------------------------------------------

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const parts = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${parts.join(',')}}`;
}

/** Stable sha256 of the semantically relevant parts of a request (cache key). */
export function hashRequest(req: SummaryRequest): string {
  const canonical = {
    params: req.params,
    derived: req.derived,
    units: req.units,
    focus: req.focus ?? 'overview',
    compare: req.compare ?? null,
  };
  return createHash('sha256').update(stableStringify(canonical)).digest('hex');
}
