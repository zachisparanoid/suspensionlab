/**
 * QuarterCarDiagram — the classic 2-DOF quarter-car stack, animated live:
 *
 *   sprung mass (m_s)  ← body corner
 *   spring (k_s) ∥ damper (c)
 *   unsprung mass (m_u)  ← wheel/hub
 *   tire spring (k_t)
 *   road z_r(t)  ← the selected road input, looping every 4 s
 *
 * A persistent RK4 integrator lives in a ref (sim state survives param
 * changes); the model/road closures are memoised on params. Each frame does
 * exactly ONE setState tick. Scale: 1 mm = 0.9 px, clamped to ±60 px.
 */
import { useId, useMemo, useRef, useState } from 'react';
import { useAnimationLoop, usePrefersReducedMotion } from '../../hooks/useAnimationLoop';
import { useParams, useUnits } from '../../store/useConfigStore';
import { quarterCarModel } from '../../physics/derive';
import { roadProfile } from '../../physics/response';
import { restState, stepRK4, type QuarterCarState } from '../../physics/quarterCar';
import { formatWithUnit } from '../../units/convert';

const W = 300;
const H = 360;
const PX_PER_MM = 0.9;
const DISP_CLAMP_PX = 60;
const LOOP_S = 4;
const SUBSTEP = 0.002;

// Rest-pose layout (y grows downward).
const CX = 150;
const ROAD_Y0 = 324;
const MU_W = 96;
const MU_H = 26;
const MU_BOTTOM0 = 292;
const MU_TOP0 = MU_BOTTOM0 - MU_H;
const MS_W = 150;
const MS_H = 44;
const MS_BOTTOM0 = 178;
const SPRING_X = 116;
const DAMPER_X = 184;

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const r1 = (v: number): number => Math.round(v * 10) / 10;

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
  const lead = Math.min(len * 0.12, 8);
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

export function QuarterCarDiagram() {
  const params = useParams();
  const units = useUnits();
  const reduced = usePrefersReducedMotion();
  const [, setTick] = useState(0);
  const gid = useId().replace(/:/g, '');

  // Memoised sim inputs — rebuilt on param change, never inside the frame.
  const model = useMemo(() => quarterCarModel(params, 'front'), [params]);
  const road = useMemo(
    () =>
      roadProfile(params.roadInput, params.amplitudeMm / 1000, params.sineFreqHz, params.vehicleSpeed),
    [params.roadInput, params.amplitudeMm, params.sineFreqHz, params.vehicleSpeed],
  );
  const roadLooped = useMemo(() => (t: number) => road(t % LOOP_S), [road]);

  // Persistent sim state — PRESERVED across model rebuilds.
  const simRef = useRef<{ s: QuarterCarState; t: number; acc: number }>({
    s: restState(),
    t: 0,
    acc: 0,
  });

  useAnimationLoop((dt) => {
    const sim = simRef.current;
    if (dt === 0) {
      // Reduced motion: one static deflected pose.
      let s = restState();
      for (let i = 0; i < 600; i++) s = stepRK4(model, s, i * SUBSTEP, SUBSTEP, roadLooped);
      sim.s = s;
      sim.t = 600 * SUBSTEP;
      sim.acc = 0;
      setTick((n) => n + 1);
      return;
    }
    // Accumulate fractional dt; advance in fixed substeps ≤ 2 ms.
    sim.acc += dt;
    while (sim.acc >= SUBSTEP) {
      sim.s = stepRK4(model, sim.s, sim.t, SUBSTEP, roadLooped);
      sim.t = (sim.t + SUBSTEP) % LOOP_S;
      sim.acc -= SUBSTEP;
      if (!Number.isFinite(sim.s.zs) || Math.abs(sim.s.zs) > 10) sim.s = restState();
    }
    setTick((n) => (n + 1) % 1_000_000);
  });

  // Under reduced motion the loop fires once at mount; recompute the static
  // pose from current params during render so it tracks slider changes.
  const staticSim = useMemo<QuarterCarState | null>(() => {
    if (!reduced) return null;
    let s = restState();
    for (let i = 0; i < 600; i++) s = stepRK4(model, s, i * SUBSTEP, SUBSTEP, roadLooped);
    return s;
  }, [reduced, model, roadLooped]);

  const s = reduced && staticSim ? staticSim : simRef.current.s;
  const tNow = reduced ? 600 * SUBSTEP : simRef.current.t;

  const toPx = (m: number): number => clamp(m * 1000 * PX_PER_MM, -DISP_CLAMP_PX, DISP_CLAMP_PX);
  const zsPx = toPx(s.zs);
  const zuPx = toPx(s.zu);
  const zrPx = toPx(roadLooped(tNow));

  const roadY = ROAD_Y0 - zrPx;
  const muTop = MU_TOP0 - zuPx;
  const muBottom = MU_BOTTOM0 - zuPx;
  const msBottom = MS_BOTTOM0 - zsPx;
  const msTop = msBottom - MS_H;

  const cylH = 50;
  const cylTop = muTop - cylH;
  const shaftEnd = clamp(msBottom + 58, cylTop + 8, muTop - 6);

  const zsMm = s.zs * 1000;
  const travelMm = (s.zu - s.zs) * 1000; // positive = suspension compressed

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-[340px]"
        role="img"
        aria-label="Quarter-car model: sprung and unsprung masses responding live to the road input"
      >
        <defs>
          <pattern id={`${gid}-g`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 H 0 V 24" fill="none" stroke="rgb(var(--c-edge) / 0.4)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={`url(#${gid}-g)`} />

        <text x={12} y={20} className="section-title fill-ink-2">
          QUARTER CAR
        </text>
        <text x={W - 12} y={16} textAnchor="end" className="mono text-[10px] fill-ink-2">
          body {formatWithUnit(zsMm, 'mm', units, 1)}
        </text>
        <text x={W - 12} y={30} textAnchor="end" className="mono text-[10px] fill-ink-2">
          travel {formatWithUnit(travelMm, 'mm', units, 1)}
        </text>

        {/* road input */}
        <g>
          <title>Road input z_r(t) — the excitation everything above must absorb</title>
          <line x1={48} y1={r1(roadY)} x2={252} y2={r1(roadY)} className="stroke-ink" strokeWidth={2} />
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1={56 + i * 28}
              y1={r1(roadY + 2)}
              x2={48 + i * 28}
              y2={r1(roadY + 10)}
              className="stroke-ink-3"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* tire spring k_t */}
        <g>
          <title>Tire vertical spring k_t — the tire is a spring too, in series with the suspension</title>
          <polyline
            points={zigzag(CX, muBottom, CX, roadY, 3, 7)}
            className="fill-none stroke-accent-2"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <text x={CX + 22} y={r1((muBottom + roadY) / 2 + 4)} className="mono text-[11px] fill-ink-2">
            k
            <tspan dy="3" className="text-[8px]">
              t
            </tspan>
          </text>
        </g>

        {/* unsprung mass m_u */}
        <g>
          <title>Unsprung mass m_u — wheel, hub, brake; what the tire spring carries</title>
          <rect
            x={CX - MU_W / 2}
            y={r1(muTop)}
            width={MU_W}
            height={MU_H}
            rx={6}
            className="fill-surface-2 stroke-ink-2"
            strokeWidth={1.5}
          />
          <text x={CX} y={r1(muTop + MU_H / 2 + 4)} textAnchor="middle" className="mono text-[11px] fill-ink">
            m
            <tspan dy="3" className="text-[8px]">
              u
            </tspan>
          </text>
        </g>

        {/* main spring k_s */}
        <g>
          <title>Main spring k_s — wheel-rate spring between unsprung and sprung mass</title>
          <polyline
            points={zigzag(SPRING_X, msBottom, SPRING_X, muTop, 8, 10)}
            className="fill-none stroke-accent-2"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <text x={SPRING_X - 24} y={r1((msBottom + muTop) / 2 + 4)} textAnchor="end" className="mono text-[11px] fill-ink-2">
            k
            <tspan dy="3" className="text-[8px]">
              s
            </tspan>
          </text>
        </g>

        {/* damper c: cylinder fixed to m_u, shaft sliding from m_s */}
        <g>
          <title>Damper c — resists suspension velocity; shaft slides in the cylinder (bump/rebound asymmetric)</title>
          <path
            d={`M ${DAMPER_X - 8} ${r1(cylTop)} V ${r1(muTop)} H ${DAMPER_X + 8} V ${r1(cylTop)}`}
            className="fill-surface-2 stroke-ink-2"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <line
            x1={DAMPER_X}
            y1={r1(msBottom)}
            x2={DAMPER_X}
            y2={r1(shaftEnd)}
            className="stroke-ink-2"
            strokeWidth={2.5}
          />
          <line
            x1={DAMPER_X - 6}
            y1={r1(shaftEnd)}
            x2={DAMPER_X + 6}
            y2={r1(shaftEnd)}
            className="stroke-ink-2"
            strokeWidth={3}
          />
          <text x={DAMPER_X + 18} y={r1((msBottom + muTop) / 2 + 4)} className="mono text-[11px] fill-ink-2">
            c
          </text>
        </g>

        {/* sprung mass m_s */}
        <g>
          <title>Sprung mass m_s — the body corner the suspension carries; keeping it calm is the whole game</title>
          <rect
            x={CX - MS_W / 2}
            y={r1(msTop)}
            width={MS_W}
            height={MS_H}
            rx={8}
            className="fill-surface-2 stroke-accent"
            strokeWidth={1.5}
          />
          <text x={CX} y={r1(msTop + MS_H / 2 + 4)} textAnchor="middle" className="mono text-[11px] fill-ink">
            m
            <tspan dy="3" className="text-[8px]">
              s
            </tspan>
          </text>
        </g>
      </svg>
    </div>
  );
}
