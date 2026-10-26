/**
 * Rule-based offline summary — the fallback when Claude Code isn't available.
 * Produces a decent plain-English paragraph purely from band thresholds so the
 * app stays fully educational with zero AI.
 */
import type { DerivedStats, SummaryFocus, SuspensionParams } from '../types';

function rideCharacter(f: number): string {
  if (f < 1.1) return 'plush, luxury-car soft';
  if (f < 1.5) return 'comfortable but controlled';
  if (f < 2.0) return 'firm and sporty';
  if (f < 2.5) return 'track-stiff';
  return 'extremely stiff — aero-platform territory';
}

function dampingCharacter(z: number): string {
  if (z < 0.3) return 'badly underdamped: the body will float and wallow after every input';
  if (z < 0.5) return 'lightly damped, with visible overshoot after bumps';
  if (z < 0.85) return 'in the sweet spot most engineers target (≈0.6–0.8)';
  if (z <= 1.1) return 'near critical damping — controlled, with little overshoot';
  return 'overdamped: motion is suppressed but harshness passes straight through';
}

function balanceCharacter(idx: number): string {
  if (idx < -30) return 'strongly understeer-biased (safe but push-prone at the limit)';
  if (idx < -8) return 'mildly understeer-biased — the classic stable street setup';
  if (idx <= 8) return 'close to neutral';
  if (idx <= 30) return 'mildly oversteer-biased — agile, needs an alert driver';
  return 'strongly oversteer-biased (tail-happy at the limit)';
}

export function describeSetup(
  p: SuspensionParams,
  d: DerivedStats,
  focus: SummaryFocus = 'overview',
): string {
  const fAvg = (d.rideFrequencyFront + d.rideFrequencyRear) / 2;
  const zAvg = (d.dampingRatioFront + d.dampingRatioRear) / 2;
  const parts: string[] = [];

  parts.push(
    `**Ride character.** With ride frequencies of ${d.rideFrequencyFront.toFixed(2)} Hz front / ` +
      `${d.rideFrequencyRear.toFixed(2)} Hz rear, this setup is ${rideCharacter(fAvg)}. ` +
      `Damping ratios of ${d.dampingRatioFront.toFixed(2)} / ${d.dampingRatioRear.toFixed(2)} are ${dampingCharacter(zAvg)}.`,
  );

  const split = d.frequencySplit;
  if (split >= 1.05 && split <= 1.2) {
    parts.push(
      `Your rear ride frequency runs ${((split - 1) * 100).toFixed(0)}% higher than the front — the classic **flat-ride** recipe, letting the rear "catch up" after a bump so the car pitches less.`,
    );
  } else if (split < 1) {
    parts.push(
      `The rear rides *softer* than the front (split ${split.toFixed(2)}), which tends to induce pitch after bumps; most road cars run the rear 5–20% stiffer.`,
    );
  }

  if (focus === 'handling' || focus === 'overview' || focus === 'tradeoffs') {
    parts.push(
      `**Handling.** Roll gradient is ${d.rollGradient.toFixed(2)} deg/g with ${d.rollStiffnessDistFront.toFixed(0)}% of roll stiffness up front, making the balance ${balanceCharacter(d.balanceIndex)}. ` +
        `At ${p.lateralG.toFixed(2)} g the outside tires take on ${Math.round(d.lateralLoadTransferFront + d.lateralLoadTransferRear)} N from the inside pair.`,
    );
  }

  if (d.wheelLift) {
    parts.push(
      `⚠ At the current ${p.lateralG.toFixed(2)} g scenario an inside wheel unloads completely — grip on that corner is gone and any drive/brake torque there is wasted.`,
    );
  }

  if (focus === 'comfort') {
    parts.push(
      `**Comfort.** Resonance magnification peaks at ${d.transmissibilityPeak.toFixed(2)}×; inputs above ${d.isolationAboveHz.toFixed(1)} Hz are isolated. Comfort index ${d.comfortIndex}/100.`,
    );
  }

  if (focus === 'stance') {
    const f = d.fitment;
    parts.push(
      `**Fitment.** ${p.wheelDiameterIn}×${p.wheelWidthIn}" ET${p.wheelOffsetMm} with ${p.tireWidthMm}/${p.tireAspectPct} rubber: ` +
        `${f.pokeMm >= 0 ? `${f.pokeMm.toFixed(0)} mm poke` : `${(-f.pokeMm).toFixed(0)} mm tuck`}, ` +
        `${f.fenderGapFront.toFixed(0)} mm front arch gap, stretch factor ${f.stretchFactor.toFixed(2)}. ` +
        `Clearance is **${f.rubRisk}**. Speedo error ${f.speedoErrorPct.toFixed(1)}%.`,
    );
  }

  // One tradeoff + one suggestion, always.
  if (fAvg > 1.9 && d.comfortIndex < 40) {
    parts.push(
      `**Tradeoff.** You bought flat, responsive body control at the cost of ride comfort (${d.comfortIndex}/100) — every road imperfection now reaches the chassis. Try softening spring rates ~15% and watch the step-response overshoot barely change while comfort recovers.`,
    );
  } else if (zAvg < 0.45) {
    parts.push(
      `**Tradeoff.** The soft damping lets the springs work freely but the body keeps moving long after the road input ends. Try raising rebound damping until the damping ratio reaches ~0.65 and watch the step-response ringing die out.`,
    );
  } else {
    parts.push(
      `**Try this.** Add 200 N·m/deg of rear anti-roll bar and watch the balance index move toward oversteer while total body roll drops — stiffness *distribution* steers the car's attitude, total stiffness sets how much it leans.`,
    );
  }

  return parts.join('\n\n');
}
