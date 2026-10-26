/**
 * Guided lessons. Each step is explanation + (usually) a live checkpoint
 * predicate over the current params/derived stats. Predicates must be cheap —
 * they run on every derive.
 */
import type { Lesson } from '../types';

export const LESSONS: Lesson[] = [
  {
    id: 'spring-rate',
    title: 'Springs & Wheel Rate',
    subtitle: 'Why the number on the spring isn’t what the car feels',
    icon: 'Coil',
    startPresetId: 'sports-coupe',
    steps: [
      {
        title: 'The spring is a force-per-distance device',
        body: 'A **45 N/mm** spring pushes back 45 newtons for every millimetre you compress it. Stiffer springs hold the body up harder — but the wheel almost never compresses the spring 1:1.',
      },
      {
        title: 'Leverage: the motion ratio',
        body: 'The spring sits inboard on the control arm, so when the wheel moves 10 mm the spring might only move 7 mm (MR = 0.7). Leverage applies **twice** — once on travel, once on force — so the rate at the wheel is spring rate × MR².\n\nDrop the **front motion ratio to 0.70** and watch the front wheel rate collapse even though the spring never changed.',
        checkpoint: {
          description: 'Set front motion ratio ≤ 0.70',
          predicate: (p) => p.motionRatioFront <= 0.7,
        },
      },
      {
        title: 'Recover the wheel rate with the spring',
        body: 'Now the car rides too soft. Raise the **front spring rate** until the front wheel rate is back above **40 N/mm**. This is exactly what coilover manufacturers do when a chassis has a poor motion ratio.',
        checkpoint: {
          description: 'Front wheel rate ≥ 40 N/mm with MR still ≤ 0.70',
          predicate: (p, d) => p.motionRatioFront <= 0.7 && d.wheelRateFront >= 40,
        },
      },
    ],
  },
  {
    id: 'ride-frequency',
    title: 'Ride Frequency & Flat Ride',
    subtitle: 'The one number that defines how a car rides',
    icon: 'AudioWaveform',
    startPresetId: 'sports-coupe',
    steps: [
      {
        title: 'Every car is a mass on a spring',
        body: 'Push down on a fender and let go — it bobs at its **natural frequency**: f = (1/2π)·√(k/m). Luxury cars bob lazily at ~1 Hz; track cars snap back at 2+ Hz. Watch the **Ride freq** cards as you move the spring sliders.',
      },
      {
        title: 'Make it luxury-soft',
        body: 'Soften both springs until the **front ride frequency drops below 1.2 Hz**. Feel how the step-response curve gets slow and the comfort score climbs — and notice the roll gradient ballooning at the same time. Nothing is free.',
        checkpoint: {
          description: 'Front ride frequency < 1.2 Hz',
          predicate: (_p, d) => d.rideFrequencyFront < 1.2 && d.rideFrequencyFront > 0,
        },
      },
      {
        title: 'Flat ride: rear slightly stiffer',
        body: 'A bump hits the front axle first, then the rear. If the rear oscillates a touch **faster**, it catches up with the front and the body *heaves* instead of *pitching* — Maurice Olley’s 1930s “flat ride” rule. Set the **frequency split (rear/front) between 1.05 and 1.20**.',
        checkpoint: {
          description: 'Frequency split between 1.05 and 1.20',
          predicate: (_p, d) => d.frequencySplit >= 1.05 && d.frequencySplit <= 1.2,
        },
      },
    ],
  },
  {
    id: 'damping',
    title: 'Dampers & Critical Damping',
    subtitle: 'Springs store energy. Dampers decide what happens to it.',
    icon: 'Activity',
    startPresetId: 'sports-coupe',
    steps: [
      {
        title: 'What a damper actually does',
        body: 'A spring alone would bounce forever. The damper turns motion into heat, and the **damping ratio ζ** says how fast the bounce dies: ζ=1 (critical) is the fastest return with zero overshoot. Below 1 the body overshoots and rings; above 1 it creeps back sluggishly.',
      },
      {
        title: 'Feel underdamping',
        body: 'Drop both front damper sliders to their minimum and watch the **quarter-car** and **step response**: the body sails past its target and oscillates. Get the **front damping ratio below 0.3**.',
        checkpoint: {
          description: 'Front ζ < 0.30',
          predicate: (_p, d) => d.dampingRatioFront < 0.3,
        },
      },
      {
        title: 'Find the engineer’s window',
        body: 'Now bring damping back up until **front ζ lands between 0.6 and 0.8** — the window nearly every street-performance engineer targets: quick settle, one small overshoot, no harshness. Note rebound is set higher than bump; dampers resist extension harder than compression by design.',
        checkpoint: {
          description: 'Front ζ between 0.60 and 0.80',
          predicate: (_p, d) => d.dampingRatioFront >= 0.6 && d.dampingRatioFront <= 0.8,
        },
      },
    ],
  },
  {
    id: 'arb-balance',
    title: 'Anti-Roll Bars & Balance',
    subtitle: 'Why a rear bar makes a car rotate',
    icon: 'Scale',
    startPresetId: 'sports-coupe',
    steps: [
      {
        title: 'The bar only fights roll',
        body: 'An anti-roll bar twists when one wheel moves relative to the other — so it stiffens **roll only**, leaving two-wheel bumps alone. That makes it the cleanest tool for tuning cornering balance without wrecking the ride.',
      },
      {
        title: 'Total transfer is fixed. Distribution is yours.',
        body: 'At a given lateral g, CG height and track width fix the **total** load transfer. Stiffening one axle just moves a bigger *share* of that fixed total onto it — and because tires give less grip per newton as load rises, that axle loses grip first.\n\nStiffen the **rear ARB to 700+ N·m/deg** and watch the balance index swing toward oversteer while total transfer barely moves.',
        checkpoint: {
          description: 'Rear ARB ≥ 700 N·m/deg',
          predicate: (p) => p.arbStiffnessRear >= 700,
        },
      },
      {
        title: 'Now dial it back to mild understeer',
        body: 'Most fast road setups keep a **mild understeer bias** — stable when surprised. Use both bars to put the balance index **between −25 and −5**.',
        checkpoint: {
          description: 'Balance index between −25 and −5',
          predicate: (_p, d) => d.balanceIndex >= -25 && d.balanceIndex <= -5,
        },
      },
    ],
  },
  {
    id: 'load-transfer',
    title: 'Load Transfer & Grip',
    subtitle: 'The physics tax every corner pays',
    icon: 'MoveDiagonal',
    startPresetId: 'track-day',
    steps: [
      {
        title: 'Where transfer comes from',
        body: 'Corner at 1 g and inertia pulls at the CG, a lever arm **h** above the road. That torque must react across the **track width** — load leaves the inside tires and lands on the outside ones. ΔW = m·a·h/track. Springs don’t appear in that formula: only mass, CG height, and track.',
      },
      {
        title: 'Push it to wheel lift',
        body: 'Raise **CG height** and **lateral g** until an inside wheel unloads to zero — the load-transfer bar flags it red. A lifted wheel steers, brakes, and drives *nothing*.',
        checkpoint: {
          description: 'Trigger inside wheel lift',
          predicate: (_p, d) => d.wheelLift,
        },
      },
      {
        title: 'Buy the grip back',
        body: 'Now recover: **lower the CG** and/or **widen both tracks** until all four tires carry load again at 1.2 g or more. This is why race cars are low and wide before anyone touches a spring.',
        checkpoint: {
          description: 'No wheel lift at ≥ 1.2 g lateral',
          predicate: (p, d) => p.lateralG >= 1.2 && !d.wheelLift,
        },
      },
    ],
  },
  {
    id: 'build-track-setup',
    title: 'Build a Track Setup',
    subtitle: 'Put all of it together, one subsystem at a time',
    icon: 'Trophy',
    startPresetId: 'comfort-sedan',
    steps: [
      {
        title: 'Mission briefing',
        body: 'You start from the **Comfort Sedan**. Turn it into a credible track car: stiff enough for control, damped in the window, balanced near neutral, and no wheel lift at 1.3 g. Each step locks in one subsystem.',
      },
      {
        title: 'Platform: frequency',
        body: 'Springs first. Get **both ride frequencies above 1.9 Hz** with the rear still 5–15% higher than the front.',
        checkpoint: {
          description: 'Both ride freqs ≥ 1.9 Hz, split 1.05–1.15',
          predicate: (_p, d) =>
            d.rideFrequencyFront >= 1.9 &&
            d.rideFrequencyRear >= 1.9 &&
            d.frequencySplit >= 1.05 &&
            d.frequencySplit <= 1.15,
        },
      },
      {
        title: 'Control: damping',
        body: 'Stiffer springs need more damper. Land **both damping ratios between 0.65 and 0.9**, keeping rebound above bump on each axle.',
        checkpoint: {
          description: 'Both ζ in 0.65–0.90, rebound > bump both ends',
          predicate: (p, d) =>
            d.dampingRatioFront >= 0.65 &&
            d.dampingRatioFront <= 0.9 &&
            d.dampingRatioRear >= 0.65 &&
            d.dampingRatioRear <= 0.9 &&
            p.damperReboundFront > p.damperBumpFront &&
            p.damperReboundRear > p.damperBumpRear,
        },
      },
      {
        title: 'Attitude: bars and stance',
        body: 'Use the bars for balance (**index −15…+5**) and drop the roll gradient **below 2.5 deg/g**. Lower the car if you need help — watch the fender gap while you do.',
        checkpoint: {
          description: 'Balance −15…+5 and roll gradient < 2.5 deg/g',
          predicate: (_p, d) =>
            d.balanceIndex >= -15 && d.balanceIndex <= 5 && d.rollGradient < 2.5,
        },
      },
      {
        title: 'Prove it',
        body: 'Final check: at **1.3 g lateral and −1.0 g braking**, all four wheels must stay loaded. If a wheel lifts, you know the levers now: CG down, track out, or a whisker less bar on the lifting end.',
        checkpoint: {
          description: 'lateral 1.3 g, braking −1.0 g, no wheel lift',
          predicate: (p, d) => p.lateralG >= 1.3 && p.longitudinalG <= -1.0 && !d.wheelLift,
        },
      },
    ],
  },
  {
    id: 'stance-fitment',
    title: 'Stance & Fitment',
    subtitle: 'Flush without rubbing: the geometry of the look',
    icon: 'Gem',
    startPresetId: 'sports-coupe',
    steps: [
      {
        title: 'The three numbers of fitment',
        body: '**Diameter** (wheel + sidewall) sets speedo error and arch fill. **Width + offset** set where the tire face sits — *poke* past the fender or *tuck* inside it. **Ride height** sets the gap. Everything in the Wheels & Fitment group feeds the fitment stats on the right.',
      },
      {
        title: 'Go wide, go low (offset)',
        body: 'Fit at least a **9-inch wheel** with **offset ≤ 20 mm** and watch poke climb past 25 mm. Flush is the goal; fender contact is the risk.',
        checkpoint: {
          description: 'Wheel ≥ 9" wide with ET ≤ 20 (poke ≥ 25 mm)',
          predicate: (p, d) => p.wheelWidthIn >= 9 && p.wheelOffsetMm <= 20 && d.fitment.pokeMm >= 25,
        },
      },
      {
        title: 'Camber to clear',
        body: 'The stance trick: **negative camber leans the tire’s top inboard**, pulling the shoulder out from under the fender lip. Add front camber ≤ −3.5° and watch “camber tuck” grow and rub risk retreat.',
        checkpoint: {
          description: 'Front camber ≤ −3.5°',
          predicate: (p) => p.camberFront <= -3.5,
        },
      },
      {
        title: 'Slam it — but keep it drivable',
        body: 'Drop both ride heights under **100 mm**, then juggle tire aspect, stretch, and camber until rub risk shows **“close” or better** while the fender gap stays under 35 mm. Congratulations — you’ve done real fitment math.',
        checkpoint: {
          description: 'Ride height < 100 mm, gap < 35 mm, not rubbing',
          predicate: (p, d) =>
            p.rideHeightFront < 100 &&
            p.rideHeightRear < 100 &&
            d.fitment.fenderGapFront < 35 &&
            d.fitment.rubRisk !== 'rubbing',
        },
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
