/**
 * Transmissibility chart: |sprung / road| gain vs excitation frequency on a
 * log axis. Gain > 1 means the body amplifies the road input (resonance);
 * gain < 1 means the suspension is isolating. The resonance peak is marked
 * with an amber dot and its magnification factor.
 *
 * Reads the series array straight from the store so the chart only re-renders
 * when the store publishes a new series object.
 */
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useConfigStore, useSnapshotA } from '../../store/useConfigStore';
import { formatValue } from '../../units/convert';
import type { SeriesPoint } from '../../types';

const ACCENT = '#4EA1FF';
const SNAPSHOT_STROKE = '#7C8BA1'; // chart-a
const GRID_STROKE = '#1E2732'; // edge
const MUTED = '#5C6773'; // ink-3
const RESONANCE = '#F5B14C'; // warn
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const FREQ_TICKS = [0.5, 1, 2, 5, 10, 20];

/** 10px ink-2 mono ticks; fill via CSS var so both themes stay readable. */
const TICK = {
  fontSize: 10,
  fontFamily: MONO,
  style: { fill: 'rgb(var(--c-ink-2))' },
};

interface GainPoint extends SeriesPoint {
  /** Snapshot A gain. */
  a?: number;
}

function GainTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const f = typeof label === 'number' ? label : Number(label);
  return (
    <div className="mono rounded-lg border border-edge bg-surface-2 px-2 py-1 text-[11px] text-ink shadow-panel">
      <div className="text-ink-2">{formatValue(f, 2)} Hz</div>
      {payload.map((entry) =>
        typeof entry.value === 'number' ? (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[2px] w-3 rounded-full"
              style={{ background: entry.color ?? ACCENT }}
            />
            <span className="text-ink-2">{entry.name}</span>
            <span className="ml-auto pl-2 tabular">{formatValue(entry.value, 2)}×</span>
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
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-2">
      <span
        aria-hidden="true"
        className="inline-block w-4"
        style={
          dashed
            ? { borderTop: `2px dashed ${color}` }
            : { height: 2, borderRadius: 1, background: color }
        }
      />
      {label}
    </span>
  );
}

export function TransmissibilityChart() {
  const series = useConfigStore((s) => s.derived.transmissibilitySeries);
  const snapshotA = useSnapshotA();
  const snapSeries = snapshotA?.derived.transmissibilitySeries;
  // Gain is dimensionless and Hz is identical in both unit systems,
  // so this chart needs no unit conversion.

  // Both sweeps use the same fixed log-spaced frequency grid, so an index
  // merge is exact.
  const data = useMemo<GainPoint[]>(() => {
    if (!snapSeries || snapSeries.length === 0) return series;
    return series.map((p, i) => {
      const snap = snapSeries[i];
      return snap ? { ...p, a: snap.y } : p;
    });
  }, [series, snapSeries]);

  // Resonance peak of the LIVE series, plus the y-axis cap:
  // [0, dataMax rounded up], never above 6.
  const { peakX, peakY, yMax } = useMemo(() => {
    let px = 0;
    let py = 0;
    let maxY = 0;
    for (const p of data) {
      if (p.y > py) {
        py = p.y;
        px = p.x;
      }
      maxY = Math.max(maxY, p.y, p.a ?? 0);
    }
    return { peakX: px, peakY: py, yMax: Math.min(Math.max(Math.ceil(maxY), 1), 6) };
  }, [data]);

  // If the peak got clipped by the 6× cap, pin the dot to the top edge and
  // drop its label below so it stays inside the plot.
  const dotY = Math.min(peakY, yMax);
  const labelBelow = peakY > yMax - 0.4;

  return (
    <figure
      className="m-0"
      role="img"
      aria-label={`Transmissibility chart: body motion gain versus road frequency from 0.2 to 30 hertz on a log scale. Resonance peaks at ${formatValue(peakY, 1)} times road input near ${formatValue(peakX, 1)} hertz; gain below 1 means the suspension isolates.`}
    >
      <div className="mb-1 flex items-center justify-end gap-3 px-1">
        <LegendKey color={ACCENT} label="gain" />
        {snapSeries && <LegendKey color={SNAPSHOT_STROKE} label="snapshot A" dashed />}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 10, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.5} />
          <XAxis
            dataKey="x"
            type="number"
            scale="log"
            domain={[0.2, 30]}
            ticks={FREQ_TICKS}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickFormatter={(v: number) => formatValue(v, v < 1 ? 1 : 0)}
            label={{
              value: 'frequency (Hz)',
              position: 'insideBottom',
              offset: -8,
              fontSize: 10,
              fontFamily: MONO,
              fill: MUTED,
            }}
          />
          <YAxis
            width={40}
            type="number"
            domain={[0, yMax]}
            allowDataOverflow
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickFormatter={(v: number) => formatValue(v, 0)}
            label={{
              value: 'gain (body ÷ road)',
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
            content={(p: TooltipProps<number, string>) => <GainTooltipContent {...p} />}
          />
          <ReferenceLine
            y={1}
            stroke={MUTED}
            strokeDasharray="4 4"
            label={{
              value: 'isolation',
              position: 'insideBottomRight',
              fontSize: 9,
              fontFamily: MONO,
              fill: MUTED,
            }}
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
            name="gain"
            stroke={ACCENT}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          {data.length > 0 && peakY > 0 && (
            <ReferenceDot
              x={peakX}
              y={dotY}
              r={4}
              fill={RESONANCE}
              stroke="none"
              label={{
                value: `${formatValue(peakY, 1)}×`,
                position: labelBelow ? 'bottom' : 'top',
                fontSize: 10,
                fontFamily: MONO,
                fill: RESONANCE,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
