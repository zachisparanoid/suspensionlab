/**
 * RoadInputControls — the excitation strip under the quarter-car diagram:
 * road-shape selector (step / bump / pothole / sine, with tiny waveform
 * icons) plus compact sliders for amplitude, vehicle speed, and — when the
 * sine road is active — sine frequency. Ranges/labels come from PARAM_META;
 * values display in the active unit system and commit through setParam.
 */
import type { CSSProperties } from 'react';
import { useConfigStore, useUnits } from '../../store/useConfigStore';
import { PARAM_META } from '../../data/parameterMeta';
import { formatWithUnit } from '../../units/convert';
import { Tooltip } from '../common/Tooltip';
import type { ParamKey, RoadInputType } from '../../types';

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

const ROAD_TYPES: Array<{ value: RoadInputType; label: string; hint: string; d: string }> = [
  {
    value: 'step',
    label: 'Step',
    d: 'M1 11 H9 V3 H21',
    hint: 'Kerb-style step: the road rises and stays up — watch how quickly (and how cleanly) the body settles.',
  },
  {
    value: 'bump',
    label: 'Bump',
    d: 'M1 11 C6 11 6 3 11 3 C16 3 16 11 21 11',
    hint: 'Half-sine speed bump, traversed at the current vehicle speed — faster hits push the energy to higher frequency.',
  },
  {
    value: 'pothole',
    label: 'Pothole',
    d: 'M1 3 C6 3 6 11 11 11 C16 11 16 3 21 3',
    hint: 'Half-sine dip: the wheel drops in and rebound damping decides how the body catches up.',
  },
  {
    value: 'sine',
    label: 'Sine',
    d: 'M1 7 C3 1.5 5 1.5 7 7 C9 12.5 11 12.5 13 7 C15 1.5 17 1.5 19 7',
    hint: 'Continuous sine road: sweep the frequency through the body resonance (~1–2 Hz) and wheel hop (~10–14 Hz).',
  },
];

type SliderKey = Extract<ParamKey, 'amplitudeMm' | 'vehicleSpeed' | 'sineFreqHz'>;

function MiniSlider({ paramKey }: { paramKey: SliderKey }) {
  const value = useConfigStore((s) => s.params[paramKey]);
  const setParam = useConfigStore((s) => s.setParam);
  const units = useUnits();
  const meta = PARAM_META[paramKey];
  const pct = clamp(((value - meta.min) / (meta.max - meta.min)) * 100, 0, 100);

  return (
    <div className="flex items-center gap-2.5">
      <Tooltip content={meta.help}>
        <span className="w-[92px] shrink-0 cursor-help text-[11px] text-ink-2">{meta.label}</span>
      </Tooltip>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        aria-label={meta.label}
        onChange={(e) => setParam(paramKey, Number(e.target.value))}
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
      <span className="mono w-[76px] shrink-0 text-right text-[11px] tabular text-ink-2">
        {formatWithUnit(value, meta.unit, units, meta.decimals ?? 0)}
      </span>
    </div>
  );
}

export function RoadInputControls() {
  const roadInput = useConfigStore((s) => s.params.roadInput);
  const setParam = useConfigStore((s) => s.setParam);

  return (
    <div className="border-t border-edge p-4">
      <div className="mb-3 flex items-center gap-2">
        <Tooltip content={PARAM_META.roadInput.help}>
          <span className="section-title cursor-help">Road input</span>
        </Tooltip>
      </div>

      <div role="radiogroup" aria-label={PARAM_META.roadInput.label} className="flex flex-wrap gap-1.5">
        {ROAD_TYPES.map((t) => {
          const active = roadInput === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${t.label} road input`}
              title={t.hint}
              onClick={() => setParam('roadInput', t.value)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
                active
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-edge bg-surface-2 text-ink-2 hover:text-ink'
              }`}
            >
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                <path
                  d={t.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2.5">
        <MiniSlider paramKey="amplitudeMm" />
        <MiniSlider paramKey="vehicleSpeed" />
        {roadInput === 'sine' && <MiniSlider paramKey="sineFreqHz" />}
      </div>
    </div>
  );
}
