/**
 * Display metadata for every derived stat: label, unit, tooltip physics
 * explanation, and qualitative bands with semantic tones.
 * Band list is evaluated in order; first band whose `upTo` ≥ value wins.
 */
import type { StatMeta } from '../types';

export const STAT_META: StatMeta[] = [
  // ── Ride ───────────────────────────────────────────────────────────
  {
    key: 'rideFrequencyFront',
    label: 'Ride freq (front)',
    unit: 'Hz',
    decimals: 2,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Natural bounce frequency of the front of the body on its springs (tire included). ~1.0 Hz = luxury, 1.4–1.8 Hz = sporty street, 2.0–2.5 Hz = track, 3+ Hz = aero car.',
    bands: [
      { upTo: 1.2, label: 'plush', tone: 'accent2' },
      { upTo: 1.8, label: 'sporty', tone: 'accent' },
      { upTo: 2.6, label: 'track', tone: 'warn' },
      { upTo: Infinity, label: 'extreme', tone: 'danger' },
    ],
  },
  {
    key: 'rideFrequencyRear',
    label: 'Ride freq (rear)',
    unit: 'Hz',
    decimals: 2,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Rear body bounce frequency. Road cars usually run it 5–20% HIGHER than the front so the rear catches up after a bump and the car stays flat (the “flat ride” principle).',
    bands: [
      { upTo: 1.2, label: 'plush', tone: 'accent2' },
      { upTo: 1.8, label: 'sporty', tone: 'accent' },
      { upTo: 2.6, label: 'track', tone: 'warn' },
      { upTo: Infinity, label: 'extreme', tone: 'danger' },
    ],
  },
  {
    key: 'frequencySplit',
    label: 'Freq split (R/F)',
    unit: '',
    decimals: 2,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Rear ÷ front ride frequency. 1.05–1.20 is the classic flat-ride window. Below 1.0 the car tends to pitch and “porpoise” after bumps.',
    bands: [
      { upTo: 0.99, label: 'pitchy', tone: 'warn' },
      { upTo: 1.04, label: 'neutral', tone: 'neutral' },
      { upTo: 1.2, label: 'flat-ride', tone: 'accent2' },
      { upTo: Infinity, label: 'rear-stiff', tone: 'warn' },
    ],
  },
  {
    key: 'dampingRatioFront',
    label: 'Damping ζ (front)',
    unit: '',
    decimals: 2,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'How fast front oscillation dies out. ζ=1 is critical damping (no overshoot). Street cars target 0.5–0.7, race cars 0.65–0.9. Below 0.4 floats; above 1.1 feels dead and harsh.',
    bands: [
      { upTo: 0.4, label: 'floaty', tone: 'danger' },
      { upTo: 0.55, label: 'soft', tone: 'accent2' },
      { upTo: 0.85, label: 'sweet spot', tone: 'accent' },
      { upTo: 1.1, label: 'firm', tone: 'warn' },
      { upTo: Infinity, label: 'overdamped', tone: 'danger' },
    ],
  },
  {
    key: 'dampingRatioRear',
    label: 'Damping ζ (rear)',
    unit: '',
    decimals: 2,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Rear damping ratio (bump/rebound averaged, referenced to critical damping 2√(k·m)).',
    bands: [
      { upTo: 0.4, label: 'floaty', tone: 'danger' },
      { upTo: 0.55, label: 'soft', tone: 'accent2' },
      { upTo: 0.85, label: 'sweet spot', tone: 'accent' },
      { upTo: 1.1, label: 'firm', tone: 'warn' },
      { upTo: Infinity, label: 'overdamped', tone: 'danger' },
    ],
  },
  {
    key: 'wheelRateFront',
    label: 'Wheel rate (front)',
    unit: 'N/mm',
    decimals: 1,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Effective spring rate measured AT THE WHEEL: spring rate × motion ratio². This, not the spring’s sticker, is what the chassis feels.',
  },
  {
    key: 'wheelRateRear',
    label: 'Wheel rate (rear)',
    unit: 'N/mm',
    decimals: 1,
    direction: 'neutral',
    group: 'ride',
    tooltip: 'Rear wheel rate = rear spring rate × motion ratio².',
  },
  {
    key: 'transmissibilityPeak',
    label: 'Resonance peak',
    unit: '×',
    decimals: 2,
    direction: 'lowerBetter',
    group: 'ride',
    tooltip:
      'How much the body magnifies road input at its resonant frequency. 1.5× is well controlled; 3×+ means the body amplifies every ripple near that frequency.',
    bands: [
      { upTo: 1.6, label: 'controlled', tone: 'accent2' },
      { upTo: 2.5, label: 'lively', tone: 'accent' },
      { upTo: 4, label: 'resonant', tone: 'warn' },
      { upTo: Infinity, label: 'wild', tone: 'danger' },
    ],
  },
  {
    key: 'isolationAboveHz',
    label: 'Isolation above',
    unit: 'Hz',
    decimals: 1,
    direction: 'lowerBetter',
    group: 'ride',
    tooltip:
      'Frequency above which the suspension attenuates road input (gain < 1). Everything faster than this — coarse chip, expansion joints — reaches the cabin smaller than it hit the tire.',
  },
  {
    key: 'unsprungFrequencyFront',
    label: 'Wheel hop (front)',
    unit: 'Hz',
    decimals: 1,
    direction: 'neutral',
    group: 'ride',
    tooltip:
      'Resonant frequency of the wheel itself bouncing between spring and tire (typically 10–14 Hz). Damping has to control this mode too or the tire skips over washboard.',
  },
  {
    key: 'unsprungFrequencyRear',
    label: 'Wheel hop (rear)',
    unit: 'Hz',
    decimals: 1,
    direction: 'neutral',
    group: 'ride',
    tooltip: 'Rear wheel-hop frequency.',
  },

  // ── Roll / handling ────────────────────────────────────────────────
  {
    key: 'rollGradient',
    label: 'Roll gradient',
    unit: 'deg/g',
    decimals: 2,
    direction: 'neutral',
    group: 'roll',
    tooltip:
      'Body roll per g of cornering. Luxury ≈ 6–7, sporty street ≈ 3–5, race ≈ 1–2, karts/F1 < 1. Lower = flatter but transmits more single-wheel harshness via the bars.',
    bands: [
      { upTo: 1.5, label: 'race-flat', tone: 'warn' },
      { upTo: 3.5, label: 'sporty', tone: 'accent' },
      { upTo: 6, label: 'street', tone: 'accent2' },
      { upTo: Infinity, label: 'barge', tone: 'danger' },
    ],
  },
  {
    key: 'totalRollStiffness',
    label: 'Total roll stiffness',
    unit: 'N·m/deg',
    decimals: 0,
    direction: 'neutral',
    group: 'roll',
    tooltip:
      'Combined resistance to body roll from all four springs plus both anti-roll bars.',
  },
  {
    key: 'rollStiffnessDistFront',
    label: 'Roll stiffness front %',
    unit: '%',
    decimals: 1,
    direction: 'neutral',
    group: 'roll',
    tooltip:
      'Front share of total roll stiffness — the balance dial. More front % = more front load transfer = understeer; more rear % = oversteer. Compare it against front weight %.',
  },
  {
    key: 'pitchGradient',
    label: 'Pitch gradient',
    unit: 'deg/g',
    decimals: 2,
    direction: 'lowerBetter',
    group: 'roll',
    tooltip:
      'Nose-dive per g of braking (after anti-dive/anti-squat geometry takes its share). What makes a car feel like it kneels under braking.',
  },

  // ── Loads ──────────────────────────────────────────────────────────
  {
    key: 'lateralLoadTransferFront',
    label: 'Lat. transfer (front)',
    unit: 'N',
    decimals: 0,
    direction: 'neutral',
    group: 'loads',
    tooltip:
      'Load moved from inside-front to outside-front tire at the scenario’s lateral g, through springs/bar, roll-center geometry, and unsprung mass.',
  },
  {
    key: 'lateralLoadTransferRear',
    label: 'Lat. transfer (rear)',
    unit: 'N',
    decimals: 0,
    direction: 'neutral',
    group: 'loads',
    tooltip:
      'Rear-axle lateral load transfer. Tires make less grip per newton as load rises, so the loaded axle loses relative grip — this is why transfer distribution steers balance.',
  },
  {
    key: 'longitudinalLoadTransfer',
    label: 'Long. transfer',
    unit: 'N',
    decimals: 0,
    direction: 'neutral',
    group: 'loads',
    tooltip:
      'Load moved between axles by braking/acceleration: m·g·a·h/wheelbase. Longer, lower cars transfer less.',
  },

  // ── Balance ────────────────────────────────────────────────────────
  {
    key: 'balanceIndex',
    label: 'Balance index',
    unit: '',
    decimals: 0,
    direction: 'neutral',
    group: 'balance',
    tooltip:
      'Signed balance score: (front weight % − front load-transfer %) × 5. Negative = understeer-biased (front tires saturate first), positive = oversteer-biased. Zero = transfer matches weight.',
    bands: [
      { upTo: -30, label: 'strong understeer', tone: 'warn' },
      { upTo: -8, label: 'mild understeer', tone: 'accent2' },
      { upTo: 8, label: 'neutral', tone: 'accent' },
      { upTo: 30, label: 'mild oversteer', tone: 'warn' },
      { upTo: Infinity, label: 'strong oversteer', tone: 'danger' },
    ],
  },
  {
    key: 'comfortIndex',
    label: 'Comfort score',
    unit: '/100',
    decimals: 0,
    direction: 'higherBetter',
    group: 'balance',
    tooltip:
      'Heuristic: 100 − penalties for ride frequency above 1 Hz (−28/Hz), damping away from ζ=0.55 (−60/unit), resonance peak above 1.5× (−12/×). A soft, well-damped, non-resonant car scores high.',
    bands: [
      { upTo: 30, label: 'punishing', tone: 'danger' },
      { upTo: 55, label: 'firm', tone: 'warn' },
      { upTo: 78, label: 'compliant', tone: 'accent' },
      { upTo: Infinity, label: 'plush', tone: 'accent2' },
    ],
  },
  {
    key: 'sportIndex',
    label: 'Sport score',
    unit: '/100',
    decimals: 0,
    direction: 'higherBetter',
    group: 'balance',
    tooltip:
      'Heuristic: rewards ride frequency toward 2.2 Hz (45 pts), damping near ζ=0.7 (25 pts), and a flat body under 0.5 deg/g roll (30 pts). Formula documented, not magic.',
    bands: [
      { upTo: 30, label: 'relaxed', tone: 'accent2' },
      { upTo: 60, label: 'eager', tone: 'accent' },
      { upTo: Infinity, label: 'weaponised', tone: 'warn' },
    ],
  },

  // ── Fitment ────────────────────────────────────────────────────────
  {
    key: 'fitment.tireOverallDiameter',
    label: 'Tire diameter',
    unit: 'mm',
    decimals: 0,
    direction: 'neutral',
    group: 'fitment',
    tooltip: 'Overall tire diameter: rim + 2× sidewall. Compare with stock to see gearing/speedo effects.',
  },
  {
    key: 'fitment.pokeMm',
    label: 'Poke / tuck',
    unit: 'mm',
    decimals: 0,
    direction: 'neutral',
    group: 'fitment',
    tooltip:
      'How far the wheel face sits outboard (+poke) or inboard (−tuck) of the stock 17×7 ET45 reference. Positive numbers fill the fender — or hit it.',
    bands: [
      { upTo: -10, label: 'tucked', tone: 'neutral' },
      { upTo: 15, label: 'flush-ish', tone: 'accent2' },
      { upTo: 35, label: 'poke', tone: 'warn' },
      { upTo: Infinity, label: 'big poke', tone: 'danger' },
    ],
  },
  {
    key: 'fitment.fenderGapFront',
    label: 'Fender gap (front)',
    unit: 'mm',
    decimals: 0,
    direction: 'neutral',
    group: 'fitment',
    tooltip:
      'Estimated tire-to-fender gap at the front arch (70 mm reference at 140 mm ride height, moves 1:1 with ride height and tire radius). The number stance builds chase.',
    bands: [
      { upTo: 5, label: 'tucked/rubbing', tone: 'danger' },
      { upTo: 25, label: 'aggressive', tone: 'warn' },
      { upTo: 55, label: 'clean', tone: 'accent2' },
      { upTo: Infinity, label: '4x4 gap', tone: 'neutral' },
    ],
  },
  {
    key: 'fitment.stretchFactor',
    label: 'Tire stretch',
    unit: '',
    decimals: 2,
    direction: 'neutral',
    group: 'fitment',
    tooltip:
      'Tire section width ÷ rim width. OEM fitments sit around 1.1–1.3 (“square”); below ~1.0 the sidewall pulls visibly inward — the stretched look. Less sidewall support, sharper turn-in, easier to de-bead.',
    bands: [
      { upTo: 0.85, label: 'extreme stretch', tone: 'danger' },
      { upTo: 0.98, label: 'stretched', tone: 'warn' },
      { upTo: 1.35, label: 'square', tone: 'accent2' },
      { upTo: Infinity, label: 'bulged', tone: 'neutral' },
    ],
  },
  {
    key: 'fitment.speedoErrorPct',
    label: 'Speedo error',
    unit: '%',
    decimals: 1,
    direction: 'neutral',
    group: 'fitment',
    tooltip:
      'Positive = speedometer reads faster than reality (smaller tire). Negative = you’re speeding while the dash says you aren’t (bigger tire).',
  },
];

export const STAT_META_BY_KEY: Record<string, StatMeta> = Object.fromEntries(
  STAT_META.map((s) => [s.key, s]),
);

/** Resolve possibly-nested stat key like 'fitment.pokeMm' from DerivedStats. */
export function statValue(derived: Record<string, unknown>, key: string): number {
  const parts = key.split('.');
  let v: unknown = derived;
  for (const p of parts) {
    if (v == null || typeof v !== 'object') return NaN;
    v = (v as Record<string, unknown>)[p];
  }
  return typeof v === 'number' ? v : NaN;
}

export function bandFor(meta: StatMeta, value: number) {
  if (!meta.bands || !Number.isFinite(value)) return undefined;
  return meta.bands.find((b) => value <= b.upTo);
}
