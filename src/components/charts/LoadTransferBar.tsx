/**
 * Top-down corner-load visualization (hand-rolled SVG, not Recharts).
 *
 * Each corner shows a filled circle whose AREA is proportional to the dynamic
 * corner load relative to that corner's static load — so all four circles are
 * equal-size at rest and the "weight flowing across the car" is legible at a
 * glance. Lifted corners pulse in danger red. Arrows from the CG show the
 * lateral / longitudinal acceleration scenario, and snapshot A overlays as
 * dashed outline circles.
 */
import { useDerived, useParams, useSnapshotA, useUnits } from '../../store/useConfigStore';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { formatValue, toDisplay, unitLabel } from '../../units/convert';
import type { CornerLoads } from '../../types';

const SNAPSHOT_STROKE = '#7C8BA1'; // chart-a

const W = 340;
const H = 260;
const CX = W / 2;
const CY = H / 2;

/** Wheel-center positions, front at the top. */
const CORNERS: Record<keyof CornerLoads, { x: number; y: number; label: string }> = {
  fl: { x: 96, y: 70, label: 'FL' },
  fr: { x: 244, y: 70, label: 'FR' },
  rl: { x: 96, y: 190, label: 'RL' },
  rr: { x: 244, y: 190, label: 'RR' },
};
const CORNER_KEYS = Object.keys(CORNERS) as Array<keyof CornerLoads>;

/** Circle radius at static load; area scales with load from there. */
const R_STATIC = 17;
const R_MAX = 30;
/** Arrow pixels per g of acceleration. */
const PX_PER_G = 45;

/** Radius whose AREA is proportional to load / reference. */
function loadRadius(loadN: number, referenceN: number): number {
  if (!(referenceN > 0) || !Number.isFinite(loadN) || loadN <= 0) return 0;
  return Math.min(R_STATIC * Math.sqrt(loadN / referenceN), R_MAX);
}

/** Line + arrowhead from (x1,y1) toward (x2,y2), in accent. */
function GArrow({
  x1,
  y1,
  x2,
  y2,
  label,
  labelAnchor,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelAnchor: 'start' | 'middle' | 'end';
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Arrowhead: 8 long, 7 wide, tip at (x2, y2).
  const bx = x2 - ux * 8;
  const by = y2 - uy * 8;
  const head = `${x2},${y2} ${bx - uy * 3.5},${by + ux * 3.5} ${bx + uy * 3.5},${by - ux * 3.5}`;
  return (
    <g className="text-accent">
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke="currentColor" strokeWidth={2} />
      <polygon points={head} fill="currentColor" />
      <text
        x={x2 + ux * 12 + (labelAnchor === 'middle' ? 0 : ux * 2)}
        y={y2 + uy * 12 + 3}
        textAnchor={labelAnchor}
        fontSize={9}
        className="font-mono fill-accent"
      >
        {label}
      </text>
    </g>
  );
}

export function LoadTransferBar() {
  const derived = useDerived();
  const params = useParams();
  const units = useUnits();
  const snapshotA = useSnapshotA();

  const {
    staticCornerLoads: staticLoads,
    dynamicCornerLoads: dynLoads,
    liftedCorners,
    wheelLift,
  } = derived;
  const snapLoads = snapshotA?.derived.dynamicCornerLoads;

  const forceUnit = unitLabel('force', units);
  const fmtForce = (n: number) => formatValue(toDisplay(n, 'force', units), 0);

  const lateralG = params.lateralG;
  const longitudinalG = params.longitudinalG;

  const ariaLabel =
    `Top-down corner load diagram at ${formatValue(lateralG, 2)} g lateral and ` +
    `${formatValue(longitudinalG, 2)} g longitudinal. ` +
    CORNER_KEYS.map((k) => `${CORNERS[k].label} ${fmtForce(dynLoads[k])} ${forceUnit}`).join(', ') +
    (wheelLift ? '. Warning: at least one inside wheel has lifted.' : '.');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex min-h-6 items-center justify-center">
        {wheelLift && (
          <Tooltip
            content={
              <span>
                A corner load reached <strong>zero</strong> — the spring and tire there are fully
                unloaded, so that tire has <strong>no grip at all</strong>. Any extra cornering
                force must come from the remaining tires; more lateral load transfer tips the car
                onto two wheels.
              </span>
            }
            width={300}
          >
            <Badge tone="danger" pulse>
              Inside wheel lifting at {formatValue(lateralG, 2)}g
            </Badge>
          </Tooltip>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[340px]"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Direction of travel */}
        <text
          x={CX}
          y={26}
          textAnchor="middle"
          fontSize={9}
          letterSpacing={2}
          className="font-mono fill-ink-3"
        >
          FRONT
        </text>

        {/* Axle stubs connecting wheels to the body */}
        {CORNER_KEYS.map((k) => {
          const c = CORNERS[k];
          const inboardX = c.x < CX ? 130 : 210;
          return (
            <line
              key={`axle-${k}`}
              x1={c.x}
              y1={c.y}
              x2={inboardX}
              y2={c.y}
              strokeWidth={3}
              className="stroke-edge"
            />
          );
        })}

        {/* Car body (top-down) with greenhouse */}
        <rect
          x={126}
          y={42}
          width={88}
          height={176}
          rx={26}
          strokeWidth={1.5}
          className="fill-surface-2 stroke-edge"
        />
        <rect x={140} y={96} width={60} height={58} rx={12} className="fill-edge/60" />

        {/* Tires */}
        {CORNER_KEYS.map((k) => {
          const c = CORNERS[k];
          return (
            <rect
              key={`tire-${k}`}
              x={c.x - 8}
              y={c.y - 17}
              width={16}
              height={34}
              rx={5}
              className="fill-ink-3/30"
            />
          );
        })}

        {/* Corner position labels, outboard */}
        {CORNER_KEYS.map((k) => {
          const c = CORNERS[k];
          const left = c.x < CX;
          return (
            <text
              key={`lbl-${k}`}
              x={left ? c.x - 24 : c.x + 24}
              y={c.y + 3}
              textAnchor={left ? 'end' : 'start'}
              fontSize={8}
              className="font-mono fill-ink-3"
            >
              {CORNERS[k].label}
            </text>
          );
        })}

        {/* Snapshot A corner loads: dashed outline circles on the same scale */}
        {snapLoads &&
          CORNER_KEYS.map((k) => {
            const r = loadRadius(snapLoads[k], staticLoads[k]);
            if (r < 1) return null;
            const c = CORNERS[k];
            return (
              <circle
                key={`snap-${k}`}
                cx={c.x}
                cy={c.y}
                r={r}
                fill="none"
                stroke={SNAPSHOT_STROKE}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            );
          })}

        {/* Live corner loads: filled circles, area ∝ load */}
        {CORNER_KEYS.map((k) => {
          const c = CORNERS[k];
          const lifted = liftedCorners.includes(k);
          if (lifted) {
            // Load is zero — mark the airborne corner with a pulsing ring.
            return (
              <circle
                key={`load-${k}`}
                cx={c.x}
                cy={c.y}
                r={10}
                strokeWidth={2}
                strokeDasharray="3 3"
                className="danger-pulse fill-danger/10 stroke-danger"
              />
            );
          }
          const r = loadRadius(dynLoads[k], staticLoads[k]);
          return (
            <circle
              key={`load-${k}`}
              cx={c.x}
              cy={c.y}
              r={Math.max(r, 2)}
              strokeWidth={1.5}
              className="fill-accent/25 stroke-accent"
            />
          );
        })}

        {/* Per-corner readouts: load and signed delta vs static */}
        {CORNER_KEYS.map((k) => {
          const c = CORNERS[k];
          const lifted = liftedCorners.includes(k);
          const deltaN = dynLoads[k] - staticLoads[k];
          const deltaDisplay = toDisplay(Math.abs(deltaN), 'force', units);
          const gaining = deltaN > 0.5;
          const losing = deltaN < -0.5;
          const deltaText = gaining
            ? `+${formatValue(deltaDisplay, 0)}`
            : losing
              ? `−${formatValue(deltaDisplay, 0)}`
              : '±0';
          const deltaClass = gaining ? 'fill-accent-2' : losing ? 'fill-danger' : 'fill-ink-3';
          return (
            <g key={`text-${k}`}>
              <text
                x={c.x}
                y={c.y + 40}
                textAnchor="middle"
                fontSize={10}
                className={`font-mono ${lifted ? 'fill-danger' : 'fill-ink'}`}
              >
                {fmtForce(dynLoads[k])} {forceUnit}
              </text>
              <text
                x={c.x}
                y={c.y + 52}
                textAnchor="middle"
                fontSize={9}
                className={`font-mono ${deltaClass}`}
              >
                {deltaText}
              </text>
            </g>
          );
        })}

        {/* CG marker + scenario G arrows (inertial reaction: load moves with the arrow) */}
        <circle cx={CX} cy={CY} r={3} className="fill-ink-3" />
        {lateralG > 0.02 && (
          <GArrow
            x1={CX}
            y1={CY}
            x2={CX + Math.min(lateralG, 1.6) * PX_PER_G}
            y2={CY}
            label={`${formatValue(lateralG, 2)}g lat`}
            labelAnchor="middle"
          />
        )}
        {Math.abs(longitudinalG) > 0.02 && (
          <GArrow
            x1={CX}
            y1={CY}
            x2={CX}
            // Braking (negative) shifts load forward → arrow toward the nose.
            y2={CY + Math.max(Math.min(longitudinalG, 0.8), -1.2) * PX_PER_G}
            label={`${formatValue(Math.abs(longitudinalG), 2)}g ${longitudinalG < 0 ? 'brake' : 'accel'}`}
            labelAnchor="middle"
          />
        )}
      </svg>
    </div>
  );
}
