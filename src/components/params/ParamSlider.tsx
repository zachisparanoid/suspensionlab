/**
 * One labelled row for a single suspension parameter: slider + editable
 * numeric input + unit + per-param reset. The store holds SI values;
 * everything shown or typed here goes through units/convert.ts, so switching
 * unit systems never mutates state.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import type { ParamMeta } from '../../types';
import { useConfigStore, useUnits } from '../../store/useConfigStore';
import { formatValue, fromDisplay, kindForUnit, toDisplay, unitLabel } from '../../units/convert';
import { Tooltip } from '../common/Tooltip';
import { IconButton } from '../common/IconButton';

interface ParamSliderProps {
  meta: ParamMeta;
}

/** Decimal places needed to represent a (possibly fractional) display step. */
function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0 || step >= 1) return 0;
  return Math.min(3, Math.ceil(-Math.log10(step)));
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function ParamSlider({ meta }: ParamSliderProps) {
  const units = useUnits();
  const setParam = useConfigStore((s) => s.setParam);
  const resetParam = useConfigStore((s) => s.resetParam);
  const rawValue = useConfigStore((s) => s.params[meta.key]);
  const rawBaseline = useConfigStore((s) => s.baseline[meta.key]);
  // paramsForCategory excludes roadInput, so values here are always numeric.
  const siValue = typeof rawValue === 'number' ? rawValue : 0;
  const siBaseline = typeof rawBaseline === 'number' ? rawBaseline : 0;

  const kind = kindForUnit(meta.unit);
  const dispValue = toDisplay(siValue, kind, units);
  const dispMin = toDisplay(meta.min, kind, units);
  const dispMax = toDisplay(meta.max, kind, units);
  // Preserve the SI step COUNT in imperial so slider resolution feels identical.
  const stepCount = Math.max(1, Math.round((meta.max - meta.min) / meta.step));
  const dispStep = units === 'imperial' ? (dispMax - dispMin) / stepCount : meta.step;
  const decimals =
    units === 'imperial'
      ? Math.max(meta.decimals ?? 0, decimalsForStep(dispStep))
      : (meta.decimals ?? 2);
  const unit = unitLabel(kind, units);

  const sliderId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  const flashError = (msg: string) => {
    setRangeError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setRangeError(null), 2000);
  };

  /** Parse the typed draft, clamp to range (with feedback), commit as SI. */
  const commitDraft = () => {
    if (draft === null) return;
    const text = draft;
    setDraft(null);
    const parsed = Number.parseFloat(text.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return; // unparseable → revert silently
    let next = parsed;
    if (parsed < dispMin || parsed > dispMax) {
      next = clamp(parsed, dispMin, dispMax);
      const bound = parsed < dispMin ? dispMin : dispMax;
      flashError(
        `Clamped to ${parsed < dispMin ? 'min' : 'max'} ${formatValue(bound, decimals)}${unit ? ` ${unit}` : ''}`,
      );
    }
    setParam(meta.key, fromDisplay(next, kind, units));
  };

  /** Shift+arrow = 10× step (native arrows already do 1× step). */
  const onSliderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -1
          : 0;
    if (dir === 0) return;
    e.preventDefault();
    const next = clamp(dispValue + dir * dispStep * 10, dispMin, dispMax);
    setParam(meta.key, fromDisplay(next, kind, units));
  };

  // Ignore sub-microstep noise from imperial round-trips when deciding "dirty".
  const dirty = Math.abs(siValue - siBaseline) > meta.step * 1e-6;
  const fillPct = clamp(((dispValue - dispMin) / (dispMax - dispMin)) * 100, 0, 100);

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <label htmlFor={sliderId} className="truncate text-[12.5px] text-ink-2">
            {meta.label}
          </label>
          <Tooltip content={meta.help}>
            <span
              tabIndex={0}
              aria-label={`About ${meta.label}`}
              className="cursor-help text-ink-3 hover:text-ink-2 focus:text-ink-2"
            >
              <Info size={12} aria-hidden="true" />
            </span>
          </Tooltip>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            aria-label={meta.label}
            value={draft ?? formatValue(dispValue, decimals)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              else if (e.key === 'Escape') setDraft(null);
            }}
            className={`stat-value w-20 rounded-md border bg-surface-2 px-1.5 py-0.5 text-right text-[12.5px] transition-colors duration-150 ${
              rangeError ? 'shake border-danger text-danger' : 'border-edge text-ink'
            }`}
          />
          {unit && <span className="whitespace-nowrap text-[11px] text-ink-3">{unit}</span>}
          {dirty ? (
            <IconButton size="sm" label={`Reset ${meta.label}`} onClick={() => resetParam(meta.key)}>
              <RotateCcw size={12} />
            </IconButton>
          ) : (
            <span className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        aria-label={meta.label}
        aria-valuetext={`${formatValue(dispValue, decimals)}${unit ? ` ${unit}` : ''}`}
        min={dispMin}
        max={dispMax}
        step={dispStep}
        value={dispValue}
        style={{ '--fill': `${fillPct}%` } as CSSProperties}
        onKeyDown={onSliderKeyDown}
        onChange={(e) => {
          setDraft(null);
          const next = Number(e.target.value);
          if (Number.isFinite(next)) setParam(meta.key, fromDisplay(next, kind, units));
        }}
      />
      {rangeError && (
        <p role="status" className="mt-1 text-[11px] text-danger">
          {rangeError}
        </p>
      )}
    </div>
  );
}
