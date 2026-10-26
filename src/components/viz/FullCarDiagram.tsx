/**
 * FullCarDiagram — the live schematic centrepiece.
 *
 * FRONT view: stance (track + poke + camber + fender gap), body ROLL animated
 * as a damped spring whose settling behaviour follows the real front damping
 * ratio (ζ<0.5 visibly overshoots, ζ>1.1 creeps), springs that compress on the
 * outside of the roll, ARB bar, CG and roll-centre markers, wheel-lift pulse.
 *
 * SIDE view: silhouette that PITCHES under braking/accel (braking = nose
 * down), HEAVES with a live quarter-car simulation of the selected road
 * input, and drives over a scrolling dashed road.
 *
 * Animation architecture: all continuous state (roll/pitch spring-follow,
 * quarter-car integrator, road scroll, wheel spin) lives in refs; each frame
 * does exactly ONE setState tick. The model/road closures are memoised on
 * params so nothing is allocated inside the frame callback.
 */
import { useId, useMemo, useRef, useState } from 'react';
import { useAnimationLoop, usePrefersReducedMotion } from '../../hooks/useAnimationLoop';
import { useDerived, useParams, useUnits } from '../../store/useConfigStore';
import { quarterCarModel } from '../../physics/derive';
import { roadProfile } from '../../physics/response';
import { restState, stepRK4, type QuarterCarState } from '../../physics/quarterCar';
import { MM_PER_INCH } from '../../physics/constants';
import { PARAM_META } from '../../data/parameterMeta';
import { formatValue, formatWithUnit } from '../../units/convert';

const VIEW_W = 430;
const VIEW_H = 340;
const GROUND_Y = 306;
const S_FRONT = 0.135; // px per mm, front view
const S_SIDE = 0.09; // px per mm, side view
const ROLL_MAX_DEG = 8;
const PITCH_MAX_DEG = 6;
const LOOP_S = 4; // road-profile loop period, s
const SIM_SUBSTEP = 0.002;
const SPRING_SUBSTEP = 0.004;
const HEAVE_CLAMP_PX = 26;
const DASH_PERIOD = 28; // 18 dash + 10 gap

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const safe = (v: number, fallback: number): number => (Number.isFinite(v) ? v : fallback);
const r1 = (v: number): number => Math.round(v * 10) / 10;

function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

/** Zigzag polyline points between two anchors — the coil-spring glyph. */
function zigzag(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils: number,
  width: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return `${r1(x1)},${r1(y1)} ${r1(x2)},${r1(y2)}`;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const lead = Math.min(len * 0.12, 9);
  const ax = x1 + ux * lead;
  const ay = y1 + uy * lead;
  const bx = x2 - ux * lead;
  const by = y2 - uy * lead;
  const n = coils * 2;
  const pts: string[] = [`${r1(x1)},${r1(y1)}`, `${r1(ax)},${r1(ay)}`];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const side = i % 2 === 1 ? 1 : -1;
    pts.push(`${r1(ax + (bx - ax) * t + px * width * side)},${r1(ay + (by - ay) * t + py * width * side)}`);
  }
  pts.push(`${r1(bx)},${r1(by)}`, `${r1(x2)},${r1(y2)}`);
  return pts.join(' ');
}

interface Follow {
  a: number;
  v: number;
}

/**
 * Damped-spring follower: angleAccel = −ω₀²(a−target) − 2ζω₀·v, integrated
 * semi-implicitly in small substeps so high ω₀ stays stable.
 */
function springFollow(s: Follow, target: number, w0: number, zeta: number, dt: number): void {
  let rem = dt;
  while (rem > 0) {
    const h = Math.min(SPRING_SUBSTEP, rem);
    const acc = -w0 * w0 * (s.a - target) - 2 * zeta * w0 * s.v;
    s.v += acc * h;
    s.a += s.v * h;
    rem -= h;
  }
  if (!Number.isFinite(s.a) || !Number.isFinite(s.v)) {
    s.a = target;
    s.v = 0;
  }
}

/** Side-view silhouette with cabin + wheel-arch cutouts. */
function carBodyPath(
  x0: number,
  x1: number,
  xRear: number,
  xFront: number,
  bR: number,
  bF: number,
  archR: number,
): { d: string; belt: { x1: number; y1: number; x2: number; y2: number } } {
  const L = x1 - x0;
  const beltR = bR - 52;
  const beltF = bF - 48;
  const roofY = Math.min(beltR, beltF) - 44;
  const cabR = x0 + 0.3 * L;
  const roofA = x0 + 0.4 * L;
  const roofB = x0 + 0.6 * L;
  const cabF = x0 + 0.75 * L;
  const d = [
    `M ${r1(x0 + 8)} ${r1(bR)}`,
    `C ${r1(x0)} ${r1(bR - 6)} ${r1(x0 - 2)} ${r1(beltR + 20)} ${r1(x0 + 2)} ${r1(beltR + 4)}`,
    `C ${r1(x0 + 6)} ${r1(beltR - 5)} ${r1(cabR - 16)} ${r1(beltR - 8)} ${r1(cabR)} ${r1(beltR - 9)}`,
    `C ${r1(roofA - 12)} ${r1(roofY + 6)} ${r1(roofA - 4)} ${r1(roofY)} ${r1(roofA + 6)} ${r1(roofY)}`,
    `L ${r1(roofB)} ${r1(roofY)}`,
    `C ${r1(roofB + 12)} ${r1(roofY + 2)} ${r1(cabF - 14)} ${r1(beltF - 10)} ${r1(cabF)} ${r1(beltF - 7)}`,
    `C ${r1(cabF + 20)} ${r1(beltF - 3)} ${r1(x1 - 26)} ${r1(beltF - 2)} ${r1(x1 - 8)} ${r1(beltF + 4)}`,
    `C ${r1(x1)} ${r1(beltF + 8)} ${r1(x1 + 1)} ${r1(bF - 12)} ${r1(x1 - 3)} ${r1(bF)}`,
    `L ${r1(xFront + archR)} ${r1(bF)}`,
    `A ${r1(archR)} ${r1(archR)} 0 0 0 ${r1(xFront - archR)} ${r1(bF)}`,
    `L ${r1(xRear + archR)} ${r1(bR)}`,
    `A ${r1(archR)} ${r1(archR)} 0 0 0 ${r1(xRear - archR)} ${r1(bR)}`,
    'Z',
  ].join(' ');
  return { d, belt: { x1: cabR, y1: beltR - 6, x2: cabF - 2, y2: beltF - 5 } };
}

export function FullCarDiagram() {
  const params = useParams();
  const derived = useDerived();
  const units = useUnits();
  const reduced = usePrefersReducedMotion();
  const [, setTick] = useState(0);
  const gid = useId().replace(/:/g, '');

  // ── animation targets from physics ────────────────────────────────
  const rollTarget = clamp(safe(derived.rollGradient, 0) * params.lateralG, -ROLL_MAX_DEG, ROLL_MAX_DEG);
  const pitchMag = clamp(
    Math.abs(safe(derived.pitchGradient, 0)) * Math.abs(params.longitudinalG),
    0,
    PITCH_MAX_DEG,
  );
  // Braking (negative g) pitches the nose DOWN (positive = clockwise, nose right).
  const pitchTarget = params.longitudinalG < 0 ? pitchMag : -pitchMag;
  const w0 = 2 * Math.PI * clamp(safe(derived.rideFrequencyFront, 1.3), 0.3, 8);
  const zeta = clamp(safe(derived.dampingRatioFront, 0.7), 0.05, 4);

  // ── memoised sim inputs (never rebuilt inside the frame callback) ─
  const model = useMemo(() => quarterCarModel(params, 'front'), [params]);
  const road = useMemo(
    () =>
      roadProfile(params.roadInput, params.amplitudeMm / 1000, params.sineFreqHz, params.vehicleSpeed),
    [params.roadInput, params.amplitudeMm, params.sineFreqHz, params.vehicleSpeed],
  );
  const roadLooped = useMemo(() => (t: number) => road(t % LOOP_S), [road]);

  // ── persistent animation state (survives param changes) ──────────
  const rollF = useRef<Follow>({ a: rollTarget, v: 0 });
  const pitchF = useRef<Follow>({ a: pitchTarget, v: 0 });
  const simRef = useRef<{ s: QuarterCarState; t: number; acc: number }>({
    s: restState(),
    t: 0,
    acc: 0,
  });
  const scrollRef = useRef(0);
  const wheelRotRef = useRef(0);

  // Shared geometry needed inside the frame callback.
  const tireDmm = safe(derived.fitment.tireOverallDiameter, 630);
  const tireRs = (tireDmm / 2) * S_SIDE;

  useAnimationLoop((dt) => {
    const sim = simRef.current;
    if (dt === 0) {
      // Reduced motion: one static deflected pose.
      rollF.current = { a: rollTarget, v: 0 };
      pitchF.current = { a: pitchTarget, v: 0 };
      let s = restState();
      for (let i = 0; i < 600; i++) s = stepRK4(model, s, i * SIM_SUBSTEP, SIM_SUBSTEP, roadLooped);
      sim.s = s;
      sim.t = 600 * SIM_SUBSTEP;
      sim.acc = 0;
      setTick((n) => n + 1);
      return;
    }
    springFollow(rollF.current, rollTarget, w0, zeta, dt);
    springFollow(pitchF.current, pitchTarget, w0, zeta, dt);
    sim.acc += dt;
    while (sim.acc >= SIM_SUBSTEP) {
      sim.s = stepRK4(model, sim.s, sim.t, SIM_SUBSTEP, roadLooped);
      sim.t = (sim.t + SIM_SUBSTEP) % LOOP_S;
      sim.acc -= SIM_SUBSTEP;
      if (!Number.isFinite(sim.s.zs) || Math.abs(sim.s.zs) > 10) sim.s = restState();
    }
    const speedPx = params.vehicleSpeed * 0.6; // px/s of road scroll
    scrollRef.current = (scrollRef.current + speedPx * dt) % DASH_PERIOD;
    wheelRotRef.current =
      (wheelRotRef.current + ((speedPx * dt) / Math.max(tireRs, 5)) * (180 / Math.PI)) % 360;
    setTick((n) => (n + 1) % 1_000_000);
  });

  // Under reduced motion the loop only fires once at mount, so recompute the
  // static pose from current params during render instead.
  const staticSim = useMemo<QuarterCarState | null>(() => {
    if (!reduced) return null;
    let s = restState();
    for (let i = 0; i < 600; i++) s = stepRK4(model, s, i * SIM_SUBSTEP, SIM_SUBSTEP, roadLooped);
    return s;
  }, [reduced, model, roadLooped]);

  const rollDeg = reduced ? rollTarget : rollF.current.a;
  const pitchDeg = reduced ? pitchTarget : pitchF.current.a;
  const simState = reduced && staticSim ? staticSim : simRef.current.s;
  const wheelRotDeg = reduced ? 0 : wheelRotRef.current;
  const dashOff = reduced ? 0 : scrollRef.current;

  // ── FRONT view geometry ───────────────────────────────────────────
  const f = derived.fitment;
  const cxF = VIEW_W / 2;
  const tireRpx = (tireDmm / 2) * S_FRONT;
  const tireWpx = Math.max(params.tireWidthMm, params.wheelWidthIn * MM_PER_INCH) * S_FRONT;
  const rimWpx = params.wheelWidthIn * MM_PER_INCH * S_FRONT;
  const rimHpx = params.wheelDiameterIn * MM_PER_INCH * S_FRONT;
  const halfTrackStockPx = (params.trackFront / 2) * S_FRONT;
  const wheelHalfPx = halfTrackStockPx + safe(f.pokeMm, 0) * S_FRONT;
  const hubY = GROUND_Y - tireRpx;
  const wheelTopY = GROUND_Y - 2 * tireRpx;
  const archApexY = wheelTopY - safe(f.fenderGapFront, 40) * S_FRONT;
  const archHalfW = tireWpx / 2 + 12;
  const archH = 15;
  const bodyBottomY = GROUND_Y - params.rideHeightFront * S_FRONT;
  const bodyHalfW = Math.max(halfTrackStockPx - tireWpx / 2 - 6, 56);
  const bodyH = 92;
  const cabinHalfW = bodyHalfW * 0.7;
  const cabinH = 54;
  const cgYf = GROUND_Y - params.cgHeight * S_FRONT;
  const cgFromFrontMm = params.wheelbase * (1 - params.weightDistFront / 100);
  const rcMm =
    params.rollCenterHeightFront +
    (params.rollCenterHeightRear - params.rollCenterHeightFront) *
      (cgFromFrontMm / Math.max(params.wheelbase, 1));
  const rcY = GROUND_Y - safe(rcMm, 0) * S_FRONT;
  const lifted = derived.liftedCorners.length > 0;
  const liftPx = lifted ? 7 : 0;
  const archClass =
    f.rubRisk === 'rubbing' ? 'stroke-danger' : f.rubRisk === 'close' ? 'stroke-warn' : 'stroke-ink-2';
  const arbOff = params.arbStiffnessFront <= 0;
  const arbW = arbOff ? 1 : 1.5 + (params.arbStiffnessFront / PARAM_META.arbStiffnessFront.max) * 5.5;
  const arrowLen = clamp(params.lateralG / PARAM_META.lateralG.max, 0, 1) * 70;
  const cgRot = rotatePoint(cxF, cgYf, cxF, rcY, rollDeg);

  // ── SIDE view geometry ────────────────────────────────────────────
  const cxS = VIEW_W / 2;
  const wbPx = params.wheelbase * S_SIDE;
  const xR = cxS - wbPx / 2;
  const xF = cxS + wbPx / 2;
  const rimRs = ((params.wheelDiameterIn * MM_PER_INCH) / 2) * S_SIDE;
  const hubYs = GROUND_Y - tireRs;
  const bF = GROUND_Y - params.rideHeightFront * S_SIDE;
  const bR = GROUND_Y - params.rideHeightRear * S_SIDE;
  const archRs = tireRs + 6;
  const body = carBodyPath(xR - tireRs - 30, xF + tireRs + 34, xR, xF, bR, bF, archRs);
  const cgXs = xF - cgFromFrontMm * S_SIDE;
  const cgYs = GROUND_Y - params.cgHeight * S_SIDE;
  const heavePx = clamp(simState.zs * 1000 * 0.55, -HEAVE_CLAMP_PX, HEAVE_CLAMP_PX);

  const grid = (suffix: string) => (
    <>
      <defs>
        <pattern id={`${gid}-${suffix}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 H 0 V 24" fill="none" stroke="rgb(var(--c-edge) / 0.4)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={`url(#${gid}-${suffix})`} />
    </>
  );

  return (
    <div className="flex flex-wrap gap-3">
      {/* ═══ FRONT VIEW ═══ */}
      <div className="min-w-[280px] flex-1 basis-[300px]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Front view: body roll, stance, springs, anti-roll bar and fender clearance"
        >
          {grid('gf')}
          <text x={14} y={24} className="section-title fill-ink-2">
            FRONT
          </text>
          <text x={VIEW_W - 14} y={24} textAnchor="end" className="mono text-[11px] fill-ink-2">
            roll {formatValue(rollDeg, 1)}°
          </text>

          <line x1={10} y1={GROUND_Y} x2={VIEW_W - 10} y2={GROUND_Y} className="stroke-ink-3" strokeWidth={1.5}>
            <title>Road surface</title>
          </line>

          {/* wheels (tire + rim), cambered about the contact patch */}
          {([-1, 1] as const).map((side) => {
            const wx = cxF + side * wheelHalfPx;
            const lift = side === -1 ? liftPx : 0;
            const isLifted = side === -1 && lifted;
            return (
              <g
                key={`w${side}`}
                transform={`translate(${r1(wx)} ${-lift}) rotate(${r1(side * params.camberFront)} 0 ${GROUND_Y})`}
                className={isLifted ? 'danger-pulse' : undefined}
              >
                <rect
                  x={-tireWpx / 2}
                  y={wheelTopY}
                  width={tireWpx}
                  height={2 * tireRpx}
                  rx={Math.min(tireWpx * 0.32, 9)}
                  className={isLifted ? 'fill-ink-3 stroke-danger' : 'fill-ink-3'}
                  strokeWidth={isLifted ? 2 : 0}
                >
                  <title>
                    Tire — {formatValue(params.tireWidthMm, 0)}/{formatValue(params.tireAspectPct, 0)} at{' '}
                    {formatValue(params.camberFront, 1)}° camber
                    {isLifted ? ' — inside wheel LIFTED (zero load)' : ''}
                  </title>
                </rect>
                <rect
                  x={-rimWpx / 2}
                  y={hubY - rimHpx / 2}
                  width={rimWpx}
                  height={rimHpx}
                  rx={2.5}
                  className="fill-surface-2 stroke-edge"
                  strokeWidth={1}
                >
                  <title>
                    Wheel — {formatValue(params.wheelDiameterIn, 0)}×{formatValue(params.wheelWidthIn, 1)}″
                    ET{formatValue(params.wheelOffsetMm, 0)}
                  </title>
                </rect>
                <circle cx={0} cy={hubY} r={2.4} className="fill-ink-2" />
              </g>
            );
          })}

          {/* ARB — thickness ∝ stiffness; twists when a wheel lifts */}
          <line
            x1={r1(cxF - wheelHalfPx)}
            y1={r1(hubY - liftPx)}
            x2={r1(cxF + wheelHalfPx)}
            y2={r1(hubY)}
            className="stroke-warn"
            strokeWidth={arbW}
            strokeLinecap="round"
            strokeDasharray={arbOff ? '3 6' : undefined}
            opacity={arbOff ? 0.5 : 0.9}
          >
            <title>
              Anti-roll bar — links the two wheels; thickness ∝ stiffness (
              {formatWithUnit(params.arbStiffnessFront, 'N·m/deg', units, 0)})
            </title>
          </line>

          {/* body + fenders + CG, rolled about the roll centre */}
          <g transform={`rotate(${r1(rollDeg)} ${cxF} ${r1(rcY)})`}>
            <rect
              x={r1(cxF - bodyHalfW)}
              y={r1(bodyBottomY - bodyH)}
              width={r1(bodyHalfW * 2)}
              height={bodyH}
              rx={13}
              className="fill-surface-2 stroke-accent"
              strokeWidth={1.5}
            >
              <title>Chassis / body — rolls about the roll axis under lateral g</title>
            </rect>
            <rect
              x={r1(cxF - cabinHalfW)}
              y={r1(bodyBottomY - bodyH - cabinH + 10)}
              width={r1(cabinHalfW * 2)}
              height={cabinH}
              rx={11}
              className="fill-surface-2 stroke-accent"
              strokeOpacity={0.55}
              strokeWidth={1.5}
            >
              <title>Cabin</title>
            </rect>
            {([-1, 1] as const).map((side) => {
              const ax = cxF + side * halfTrackStockPx;
              return (
                <path
                  key={`a${side}`}
                  d={`M ${r1(ax - archHalfW)} ${r1(archApexY + archH)} A ${r1(archHalfW)} ${archH} 0 0 1 ${r1(
                    ax + archHalfW,
                  )} ${r1(archApexY + archH)}`}
                  className={`fill-none ${archClass} ${f.rubRisk === 'rubbing' ? 'danger-pulse' : ''}`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <title>
                    Fender arch — tire gap {formatWithUnit(f.fenderGapFront, 'mm', units, 0)} (
                    {f.rubRisk})
                  </title>
                </path>
              );
            })}
            <g>
              <title>CG — centre of gravity, the lever for load transfer</title>
              <circle cx={cxF} cy={r1(cgYf)} r={6.5} className="fill-none stroke-ink-2" strokeWidth={1.5} />
              <circle cx={cxF} cy={r1(cgYf)} r={2.2} className="fill-ink" />
            </g>
          </g>

          {/* springs — cutaway over the body, compress with roll */}
          {([-1, 1] as const).map((side) => {
            const top = rotatePoint(cxF + side * (bodyHalfW - 4), bodyBottomY - 46, cxF, rcY, rollDeg);
            const lift = side === -1 ? liftPx : 0;
            return (
              <polyline
                key={`s${side}`}
                points={zigzag(top.x, top.y, cxF + side * wheelHalfPx, hubY - lift, 5, 6)}
                className="fill-none stroke-accent-2"
                strokeWidth={2}
                strokeLinejoin="round"
              >
                <title>Coil spring — the outside spring compresses as the body rolls</title>
              </polyline>
            );
          })}

          {/* lateral inertia force at the CG */}
          {arrowLen > 2 && (
            <g className="stroke-accent">
              <title>Lateral inertia force at the CG (length ∝ lateral g)</title>
              <line x1={r1(cgRot.x + 12)} y1={r1(cgRot.y)} x2={r1(cgRot.x + 12 + arrowLen)} y2={r1(cgRot.y)} strokeWidth={2.5} />
              <path
                d={`M ${r1(cgRot.x + 12 + arrowLen + 8)} ${r1(cgRot.y)} l -9 -4.5 v 9 Z`}
                className="fill-accent"
                stroke="none"
              />
            </g>
          )}

          {/* roll centre */}
          <path
            d={`M ${cxF} ${r1(rcY - 5)} L ${cxF + 5} ${r1(rcY)} L ${cxF} ${r1(rcY + 5)} L ${cxF - 5} ${r1(rcY)} Z`}
            className="fill-accent"
          >
            <title>Roll centre — the geometric pivot the body rolls around</title>
          </path>
        </svg>
      </div>

      {/* ═══ SIDE VIEW ═══ */}
      <div className="min-w-[280px] flex-1 basis-[300px]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Side view: body pitch, heave over the road input, and ride height"
        >
          {grid('gs')}
          <text x={14} y={24} className="section-title fill-ink-2">
            SIDE
          </text>
          <text x={VIEW_W - 14} y={24} textAnchor="end" className="mono text-[11px] fill-ink-2">
            pitch {formatValue(pitchDeg, 1)}°
          </text>

          <line x1={10} y1={GROUND_Y} x2={VIEW_W - 10} y2={GROUND_Y} className="stroke-ink-3" strokeWidth={1.5}>
            <title>Road surface</title>
          </line>
          <line
            x1={10}
            y1={GROUND_Y + 7}
            x2={VIEW_W - 10}
            y2={GROUND_Y + 7}
            className="stroke-ink-3"
            strokeWidth={2}
            opacity={0.55}
            strokeDasharray="18 10"
            strokeDashoffset={r1(dashOff)}
          >
            <title>Road scrolling under the car — speed ∝ vehicle speed</title>
          </line>

          {/* wheels with rotating spokes */}
          {([xR, xF] as const).map((wx, i) => (
            <g key={`sw${i}`}>
              <circle cx={r1(wx)} cy={r1(hubYs)} r={r1(tireRs)} className="fill-ink-3">
                <title>{i === 0 ? 'Rear' : 'Front'} tire</title>
              </circle>
              <circle cx={r1(wx)} cy={r1(hubYs)} r={r1(rimRs)} className="fill-surface-2 stroke-edge" strokeWidth={1}>
                <title>Wheel</title>
              </circle>
              <g transform={`rotate(${r1(wheelRotDeg)} ${r1(wx)} ${r1(hubYs)})`} className="stroke-ink-3">
                <line x1={r1(wx - rimRs + 3)} y1={r1(hubYs)} x2={r1(wx + rimRs - 3)} y2={r1(hubYs)} strokeWidth={1.2} />
                <line x1={r1(wx)} y1={r1(hubYs - rimRs + 3)} x2={r1(wx)} y2={r1(hubYs + rimRs - 3)} strokeWidth={1.2} />
              </g>
              <circle cx={r1(wx)} cy={r1(hubYs)} r={2} className="fill-ink-2" />
            </g>
          ))}

          {/* body: pitches about the CG, heaves with the quarter-car sim */}
          <g transform={`translate(0 ${r1(-heavePx)}) rotate(${r1(pitchDeg)} ${r1(cgXs)} ${r1(cgYs)})`}>
            <path d={body.d} className="fill-surface-2 stroke-accent" strokeWidth={1.5} strokeLinejoin="round">
              <title>Body — pitches under braking/accel (nose down when braking) and heaves with the road input</title>
            </path>
            <line
              x1={r1(body.belt.x1)}
              y1={r1(body.belt.y1)}
              x2={r1(body.belt.x2)}
              y2={r1(body.belt.y2)}
              className="stroke-edge"
              strokeWidth={1}
            />
            <g>
              <title>CG — centre of gravity</title>
              <circle cx={r1(cgXs)} cy={r1(cgYs)} r={6} className="fill-none stroke-ink-2" strokeWidth={1.5} />
              <circle cx={r1(cgXs)} cy={r1(cgYs)} r={2} className="fill-ink" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
