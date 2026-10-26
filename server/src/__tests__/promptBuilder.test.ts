import { describe, expect, it } from 'vitest';
import type { SummaryDerived, SummaryParams, SummaryRequest } from '../../../shared/contract';
import { buildPrompt, hashRequest } from '../claude/promptBuilder';

const params: SummaryParams = {
  vehicleMassSprung: 1250,
  unsprungMassFront: 42,
  unsprungMassRear: 44,
  weightDistFront: 53,
  wheelbase: 2650,
  trackFront: 1555,
  trackRear: 1565,
  cgHeight: 480,
  rideHeightFront: 115,
  rideHeightRear: 120,
  springRateFront: 45,
  springRateRear: 52,
  motionRatioFront: 0.95,
  motionRatioRear: 0.9,
  damperBumpFront: 3.2,
  damperReboundFront: 6.4,
  damperBumpRear: 3.5,
  damperReboundRear: 7,
  arbStiffnessFront: 320,
  arbStiffnessRear: 180,
  tireStiffnessFront: 250,
  tireStiffnessRear: 250,
  tireStaticRadius: 316,
  camberFront: -2.5,
  camberRear: -1.8,
  antiDive: 30,
  antiSquat: 40,
  rollCenterHeightFront: 55,
  rollCenterHeightRear: 90,
  wheelDiameterIn: 18,
  wheelWidthIn: 9.5,
  wheelOffsetMm: 35,
  tireWidthMm: 245,
  tireAspectPct: 40,
  lateralG: 0.9,
  longitudinalG: 0.3,
  roadInput: 'sine',
  sineFreqHz: 1.5,
  amplitudeMm: 20,
  vehicleSpeed: 100,
};

const derived: SummaryDerived = {
  wheelRateFront: 40.6,
  wheelRateRear: 42.1,
  rideFrequencyFront: 1.45,
  rideFrequencyRear: 1.58,
  frequencySplit: 0.13,
  dampingRatioFront: 0.68,
  dampingRatioRear: 0.72,
  rollGradient: 4.2,
  rollStiffnessDistFront: 58.5,
  totalRollStiffness: 950,
  lateralLoadTransferFront: 2450,
  lateralLoadTransferRear: 1980,
  balanceIndex: 0.15,
  comfortIndex: 62,
  sportIndex: 71,
  transmissibilityPeak: 1.85,
  pitchGradient: 1.1,
  wheelLift: false,
  fenderGapFront: 28,
  pokeMm: 6,
  speedoErrorPct: -1.8,
};

const baseRequest: SummaryRequest = {
  params,
  derived,
  presetName: 'Weekend Canyon',
  units: 'si',
  focus: 'overview',
};

/** Deep-clone with every object's keys inserted in reverse order. */
function reversedClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item: unknown) => reversedClone(item)) as unknown as T;
  }
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).reverse()) {
    out[key] = reversedClone(source[key]);
  }
  return out as T;
}

describe('hashRequest', () => {
  it('is stable under object key insertion order', () => {
    const reordered = reversedClone(baseRequest);
    expect(Object.keys(reordered.params)).not.toEqual(Object.keys(baseRequest.params));
    expect(hashRequest(reordered)).toBe(hashRequest(baseRequest));
  });

  it('changes when focus changes', () => {
    const handling: SummaryRequest = { ...baseRequest, focus: 'handling' };
    expect(hashRequest(handling)).not.toBe(hashRequest(baseRequest));
  });

  it('treats missing focus as overview', () => {
    const noFocus: SummaryRequest = { params, derived, units: 'si' };
    const overview: SummaryRequest = { params, derived, units: 'si', focus: 'overview' };
    expect(hashRequest(noFocus)).toBe(hashRequest(overview));
  });

  it('changes when compare is present', () => {
    const withCompare: SummaryRequest = { ...baseRequest, compare: { params, derived } };
    expect(hashRequest(withCompare)).not.toBe(hashRequest(baseRequest));
  });
});

describe('buildPrompt', () => {
  it('includes formatted key numbers in SI units', () => {
    const prompt = buildPrompt(baseRequest);
    expect(prompt).toContain('1.45'); // front ride frequency, Hz
    expect(prompt).toContain('1.58'); // rear ride frequency, Hz
    expect(prompt).toContain('N/mm'); // SI spring rate label
    expect(prompt).toContain('9.5x18 ET35'); // wheel spec
    expect(prompt).toContain('245/40R18'); // tire spec
  });

  it('labels spring rates lb/in for imperial requests', () => {
    const prompt = buildPrompt({ ...baseRequest, units: 'imperial' });
    expect(prompt).toContain('lb/in');
    expect(prompt).toContain('mph');
    expect(prompt).not.toContain('N/mm');
  });

  it('adds a PREVIOUS SETUP block in compare mode', () => {
    const prompt = buildPrompt({ ...baseRequest, compare: { params, derived } });
    expect(prompt).toContain('PREVIOUS SETUP');
    expect(prompt).toContain('what changed');
  });

  it('never leaks undefined or NaN into the prompt', () => {
    const prompts = [
      buildPrompt(baseRequest),
      buildPrompt({ params, derived, units: 'imperial' }),
      buildPrompt({ ...baseRequest, units: 'imperial', compare: { params, derived } }),
      buildPrompt({ ...baseRequest, focus: 'stance' }),
    ];
    for (const prompt of prompts) {
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('NaN');
    }
  });

  it('varies with focus', () => {
    const overview = buildPrompt(baseRequest);
    const stance = buildPrompt({ ...baseRequest, focus: 'stance' });
    expect(stance).not.toBe(overview);
    expect(stance).toContain('fitment');
  });

  it('sanitizes exotic characters out of presetName', () => {
    const prompt = buildPrompt({
      ...baseRequest,
      presetName: 'My$$Preset<script>alert(1)</script>!!',
    });
    expect(prompt).toContain('MyPresetscriptalert1script');
    expect(prompt).not.toContain('<script>');
    expect(prompt).not.toContain('$$');
    expect(prompt).not.toContain('!!');
  });

  it('omits the preset line when presetName is absent', () => {
    const prompt = buildPrompt({ params, derived, units: 'si' });
    expect(prompt).not.toContain('preset:');
  });
});
