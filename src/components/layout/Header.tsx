/**
 * Sticky app header: brand, preset picker, compare toggle, lessons entry,
 * save/load popover, unit system and theme controls.
 */
import { Crosshair, GitCompareArrows, GraduationCap, Moon, Sun } from 'lucide-react';
import type { UnitSystem } from '../../types';
import { useConfigStore } from '../../store/useConfigStore';
import { useUiStore } from '../../store/useUiStore';
import { lessonCompletionPct, useLessonStore } from '../../store/useLessonStore';
import { PresetPicker } from '../params/PresetPicker';
import { Badge } from '../common/Badge';
import { Toggle } from '../common/Toggle';
import { IconButton } from '../common/IconButton';
import { toast } from '../common/Toast';
import { SaveLoadMenu } from './SaveLoadMenu';

const UNIT_OPTIONS: Array<{ value: UnitSystem; label: string }> = [
  { value: 'si', label: 'SI' },
  { value: 'imperial', label: 'Imp' },
];

const HEADER_BTN =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors duration-150';
const HEADER_BTN_IDLE = 'border-edge bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink';
const HEADER_BTN_ACTIVE = 'border-accent/40 bg-accent/15 text-accent';

/** Stylized coilover glyph: two spring perches + coil zigzag in a rounded square. */
function Logo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      <rect
        x="1"
        y="1"
        width="20"
        height="20"
        rx="5.5"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <path d="M6.5 5.2h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6.8 7.2L15.2 8.7L6.8 10.2L15.2 11.8L6.8 13.3L15.2 14.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 16.8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const units = useConfigStore((s) => s.units);
  const theme = useConfigStore((s) => s.theme);
  const snapshotA = useConfigStore((s) => s.snapshotA);
  const setUnits = useConfigStore((s) => s.setUnits);
  const setTheme = useConfigStore((s) => s.setTheme);
  const takeSnapshot = useConfigStore((s) => s.takeSnapshot);
  const clearSnapshot = useConfigStore((s) => s.clearSnapshot);
  const openDrawer = useLessonStore((s) => s.openDrawer);
  const progress = useLessonStore((s) => s.progress);
  const pct = lessonCompletionPct(progress);
  const focusMode = useUiStore((s) => s.focusMode);
  const toggleFocus = useUiStore((s) => s.toggleFocus);

  const onCompare = () => {
    if (snapshotA) {
      clearSnapshot();
    } else {
      takeSnapshot();
      toast('Snapshot A pinned — change something and watch the deltas');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-edge bg-base/90 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Logo />
        <span className="hidden truncate text-[17px] font-semibold text-ink min-[420px]:inline">
          SuspensionLab
        </span>
        <Badge tone="neutral">beta</Badge>
      </div>

      <PresetPicker />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={snapshotA !== null}
          title={
            snapshotA
              ? 'Compare mode is on — click to clear snapshot A'
              : 'Pin the current setup as snapshot A, then tweak and compare'
          }
          className={`${HEADER_BTN} ${snapshotA ? HEADER_BTN_ACTIVE : HEADER_BTN_IDLE}`}
        >
          <GitCompareArrows size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Compare</span>
        </button>

        <button
          type="button"
          onClick={openDrawer}
          title="Open guided lessons"
          className={`${HEADER_BTN} ${HEADER_BTN_IDLE}`}
        >
          <GraduationCap size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Lessons</span>
          {pct > 0 && <Badge tone="accent2">{pct}%</Badge>}
        </button>

        <SaveLoadMenu />

        <Toggle value={units} options={UNIT_OPTIONS} onChange={setUnits} ariaLabel="Unit system" />

        <IconButton
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </IconButton>
      </div>
    </header>
  );
}
