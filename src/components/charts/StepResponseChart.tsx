/**
 * Step-response chart: sprung (body) and unsprung (wheel) displacement vs
 * time after the fixed 20 mm road step, with an optional snapshot-A overlay.
 *
 * Reads the series array straight from the store so the chart only re-renders
 * when the store publishes a new series object (numeric-only recomputes on
 * slider scrub don't touch it).
 */
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useConfigStore, useSnapshotA, useUnits } from '../../store/useConfigStore';
import { formatValue, toDisplay, unitLabel } from '../../units/convert';
import type { SeriesPoint, UnitSystem } from '../../types';

const ACCENT = '#4EA1FF';
const SNAPSHOT_STROKE = '#7C8BA1'; // chart-a
const GRID_STROKE = '#1E2732'; // edge
const MUTED = '#5C6773'; // ink-3
const MONO = '"JetBrains Mono", ui-monospace, monospace';
/** Fixed road-step height used by physics/response.ts stepResponse(), mm. */
const STEP_HEIGHT_MM = 20;

/** 10px ink-2 mono ticks; fill via CSS var so both themes stay readable. */
const TICK = {
  fontSize: 10,
  fontFamily: MONO,
  style: { fill: 'rgb(var(--c-ink-2))' },
};

interface StepPoint extends SeriesPoint {
  /** Snapshot A sprung displacement, mm. */
  a?: number;
}

function StepTooltipContent({
  active,
  payload,
  label,
  units,
}: TooltipProps<number, string> & { units: UnitSystem }) {
  if (!active || !payload || payload.length === 0) return null;
  const lengthUnit = unitLabel('length', units);
  const t = typeof label === 'number' ? label : Number(label);
  return (
    <div className="mono rounded-lg border border-edge bg-surface-2 px-2 py-1 text-[11px] text-ink shadow-panel">
      <div className="text-ink-2">t = {formatValue(t, 2)} s</div>
      {payload.map((entry) =>
        typeof entry.value === 'number' ? (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[2px] w-3 rounded-full"
              style={{ background: entry.color ?? ACCENT }}
            />
            <span className="text-ink-2">{entry.name}</span>
            <span className="ml-auto pl-2 tabular">
              {formatValue(toDisplay(entry.value, 'length', units), units === 'imperial' ? 2 : 1)}{' '}
              {lengthUnit}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}

function LegendKey({
  color,
  label,
  dashed = false,
  faint = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  faint?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-2">
      <span
        aria-hidden="true"
        className="inline-block w-4"
        style={
          dashed
            ? { borderTop: `2px dashed ${color}` }
            : { height: 2, borderRadius: 1, background: color, opacity: faint ? 0.4 : 1 }
        }
      />
      {label}
    </span>
  );
}

export function StepResponseChart() {
  const series = useConfigStore((s) => s.derived.stepResponseSeries);
  const units = useUnits();
  const snapshotA = useSnapshotA();
  const snapSeries = snapshotA?.derived.stepResponseSeries;

  // Both series come from the same fixed-duration generator, so the time
  // grids match and an index merge is exact.
  const data = useMemo<StepPoint[]>(() => {
    if (!snapSeries || snapSeries.length === 0) return series;
    return series.map((p, i) => {
      const snap = snapSeries[i];
      return snap ? { ...p, a: snap.y } : p;
    });
  }, [series, snapSeries]);

  const lengthUnit = unitLabel('length', units);
  const stepLabel = `step ${formatValue(
    toDisplay(STEP_HEIGHT_MM, 'length', units),
    units === 'imperial' ? 1 : 0,
  )} ${lengthUnit}`;

  return (
    <figure
      className="m-0"
      role="img"
      aria-label={`Step response: body and wheel displacement in ${lengthUnit} over three seconds after a fixed ${stepLabel} road input. Less overshoot and faster settling means better damping.`}
    >
      <div className="mb-1 flex items-center justify-end gap-3 px-1">
        <LegendKey color={ACCENT} label="sprung (body)" />
        <LegendKey color={ACCENT} label="unsprung (wheel)" faint />
        {snapSeries && <LegendKey color={SNAPSHOT_STROKE} label="snapshot A" dashed />}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 10, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.5} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 3]}
            ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickFormatter={(v: number) => formatValue(v, 1)}
            label={{
              value: 'time (s)',
              position: 'insideBottom',
              offset: -8,
              fontSize: 10,
              fontFamily: MONO,
              fill: MUTED,
            }}
          />
          <YAxis
            width={46}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickFormatter={(v: number) =>
              formatValue(toDisplay(v, 'length', units), units === 'imperial' ? 1 : 0)
            }
            label={{
              value: `displacement (${lengthUnit})`,
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              fontSize: 10,
              fontFamily: MONO,
              fill: MUTED,
              style: { textAnchor: 'middle' },
            }}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: MUTED, strokeDasharray: '3 3', strokeOpacity: 0.6 }}
            content={(p: TooltipProps<number, string>) => (
              <StepTooltipContent {...p} units={units} />
            )}
          />
          <ReferenceLine
            y={STEP_HEIGHT_MM}
            stroke={MUTED}
            strokeDasharray="4 4"
            label={{
              value: stepLabel,
              position: 'insideTopRight',
              fontSize: 9,
              fontFamily: MONO,
              fill: MUTED,
            }}
          />
          <Line
            dataKey="y2"
            name="unsprung (wheel)"
            stroke={ACCENT}
            strokeWidth={1}
            strokeOpacity={0.4}
            dot={false}
            activeDot={{ r: 2, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {snapSeries && (
            <Line
              dataKey="a"
              name="snapshot A"
              stroke={SNAPSHOT_STROKE}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="y"
            name="sprung (body)"
            stroke={ACCENT}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
