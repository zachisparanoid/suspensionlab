/**
 * One derived-stat readout card: label + physics tooltip, animated value in
 * the active unit system, qualitative band chip (pulses when the band
 * changes), and a delta chip vs snapshot A. `balanceIndex` additionally gets
 * a center-zero understeer/oversteer bar.
 */
import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { StatMeta } from '../../types';
import { useDerived, useSnapshotA, useUnits } from '../../store/useConfigStore';
import { bandFor, statValue } from '../../data/statMeta';
import { formatValue, kindForUnit, toDisplay, unitLabel } from '../../units/convert';
import { NumberFlow } from '../common/NumberFlow';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { usePrefersReducedMotion } from '../../hooks/useAnimationLoop';

type Tone = 'accent' | 'accent2' | 'warn' | 'danger' | 'neutral';

const DOT_CLASSES: Record<Tone, string> = {
  accent: 'bg-accent',
  accent2: 'bg-accent-2',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-ink-3',
};

const RING_CLASSES: Record<Tone, string> = {
  accent: 'ring-2 ring-accent/50',
  accent2: 'ring-2 ring-accent-2/50',
  warn: 'ring-2 ring-warn/50',
  danger: 'ring-2 ring-danger/50',
  neutral: 'ring-2 ring-ink-3/50',
};

/** Units shown verbatim (no SI↔imperial conversion label): ×, /100, ''. */
const RAW_UNITS = ['×', '/100', ''];

function deltaColor(meta: StatMeta, delta: number): string {
  if (meta.direction === 'neutral') return 'text-ink-2';
  const improved =
    meta.direction === 'higherBetter' ? delta > 0 : delta < 0;
  return improved ? 'text-accent-2' : 'text-danger';
}

export function StatCard({ meta }: { meta: StatMeta }) {
  const derived = useDerived();
  const units = useUnits();
  const snapshotA = useSnapshotA();
  const reduced = usePrefersReducedMotion();

  // Bands are defined against SI values; display converts afterwards.
  const siValue = statValue(derived as unknown as Record<string, unknown>, meta.key);
  const kind = kindForUnit(meta.unit);
  const displayValue = toDisplay(siValue, kind, units);
  const unitText = RAW_UNITS.includes(meta.unit) ? meta.unit : unitLabel(kind, units);

  const band = bandFor(meta, siValue);

  // Pulse the band chip briefly when the band label changes.
  const prevBandRef = useRef<string | undefined>(band?.label);
  const [bandFlash, setBandFlash] = useState(false);
  useEffect(() => {
    const label = band?.label;
    if (prevBandRef.current === label) return;
    prevBandRef.current = label;
    if (reduced || !label) return;
    setBandFlash(true);
    const t = setTimeout(() => setBandFlash(false), 650);
    return () => clearTimeout(t);
  }, [band?.label, reduced]);

  // Delta vs snapshot A, in display units.
  let deltaChip: JSX.Element | null = null;
  if (snapshotA) {
    const aSi = statValue(snapshotA.derived as unknown as Record<string, unknown>, meta.key);
    const delta = displayValue - toDisplay(aSi, kind, units);
    const epsilon = Math.pow(10, -meta.decimals) / 2;
    if (Number.isFinite(delta) && Math.abs(delta) >= epsilon) {
      deltaChip = (
        <span
          className={`tabular inline-flex items-center rounded bg-surface-2 px-1 py-px text-[10px] font-medium ${deltaColor(meta, delta)}`}
          aria-label={`Change vs snapshot A: ${delta >= 0 ? '+' : ''}${formatValue(delta, meta.decimals)}`}
          title="vs snapshot A"
        >
          {delta >= 0 ? '+' : ''}
          {formatValue(delta, meta.decimals)}
        </span>
      );
    }
  }

  const isBalance = meta.key === 'balanceIndex';
  const balanceMagnitude = isBalance
    ? Math.min(Math.abs(Number.isFinite(siValue) ? siValue : 0), 100) / 100
    : 0;

  return (
    <div className="rounded-lg border border-edge bg-surface-2/50 p-2.5">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] text-ink-2">{meta.label}</span>
        <Tooltip content={meta.tooltip}>
          <button
            type="button"
            aria-label={`What is ${meta.label}?`}
            className="cursor-help text-ink-3 hover:text-ink-2"
          >
            <Info size={12} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
        <NumberFlow value={displayValue} decimals={meta.decimals} className="stat-value text-stat" />
        {unitText && <span className="text-unit text-ink-3">{unitText}</span>}
        {deltaChip}
      </div>

      {isBalance && (
        <div
          className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2"
          aria-hidden="true"
        >
          {/* center notch */}
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink-3" />
          {Number.isFinite(siValue) && siValue < 0 && (
            <span
              className="absolute right-1/2 top-0 h-full rounded-l-full bg-accent-2"
              style={{ width: `${balanceMagnitude * 50}%` }}
            />
          )}
          {Number.isFinite(siValue) && siValue > 0 && (
            <span
              className="absolute left-1/2 top-0 h-full rounded-r-full bg-warn"
              style={{ width: `${balanceMagnitude * 50}%` }}
            />
          )}
        </div>
      )}

      {band && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[band.tone]}`}
            aria-hidden="true"
          />
          <Badge
            tone={band.tone}
            className={`transition-shadow duration-300 ${bandFlash ? RING_CLASSES[band.tone] : ''}`}
          >
            {band.label}
          </Badge>
        </div>
      )}
    </div>
  );
}
