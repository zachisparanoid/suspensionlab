/**
 * Slim compare-mode strip under the header (App renders it only while a
 * snapshot exists): shows how old snapshot A is, how many params differ,
 * a series legend for the charts, and swap/clear actions.
 */
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Info, X } from 'lucide-react';
import type { ParamKey } from '../../types';
import { useConfigStore, useParams, useSnapshotA } from '../../store/useConfigStore';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { toast } from '../common/Toast';

const ACTION_BTN =
  'inline-flex items-center gap-1 rounded-md border border-edge bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors';

/** Compact relative time: "8s ago" · "5m ago" · "3h ago" · "2d ago". */
function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CompareBar() {
  const snapshotA = useSnapshotA();
  const params = useParams();
  const swapSnapshot = useConfigStore((s) => s.swapSnapshot);
  const clearSnapshot = useConfigStore((s) => s.clearSnapshot);

  // Keep "pinned Xm ago" fresh even when nothing else re-renders the bar.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!snapshotA) return null;

  const changed = (Object.keys(params) as ParamKey[]).filter(
    (k) => snapshotA.params[k] !== params[k],
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-edge bg-surface px-4 py-2 text-[12px] text-ink-2">
      <span className="flex items-center gap-1.5">
        <Badge tone="neutral">A</Badge>
        <span>pinned {relTime(snapshotA.takenAt)}</span>
      </span>

      <span className={`tabular ${changed > 0 ? 'font-medium text-ink' : ''}`}>
        {changed} param{changed === 1 ? '' : 's'} changed
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="26" height="6" viewBox="0 0 26 6" aria-hidden="true" className="shrink-0">
          <line
            x1="1"
            y1="3"
            x2="25"
            y2="3"
            stroke="#7C8BA1"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        </svg>
        A (pinned)
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="26" height="6" viewBox="0 0 26 6" aria-hidden="true" className="shrink-0">
          <line
            x1="1"
            y1="3"
            x2="25"
            y2="3"
            stroke="rgb(var(--c-accent))"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        B (live)
      </span>

      <Tooltip
        side="bottom"
        content={
          <>
            <strong>Compare mode.</strong> The setup you had when you pressed Compare is
            frozen as snapshot A. Charts draw A as a dashed grey line and your live setup B
            as a solid line, and stat cards show B − A deltas — so every tweak you make is
            measured against the pinned baseline.
          </>
        }
      >
        <button
          type="button"
          aria-label="About compare mode"
          className="text-ink-3 transition-colors hover:text-ink"
        >
          <Info size={13} aria-hidden="true" />
        </button>
      </Tooltip>

      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            swapSnapshot();
            toast('Swapped — A is now the old live setup');
          }}
          title="Swap the pinned snapshot with the live setup"
          className={`${ACTION_BTN} hover:border-accent/40 hover:text-accent`}
        >
          <ArrowLeftRight size={13} aria-hidden="true" />
          Swap A/B
        </button>
        <button
          type="button"
          onClick={clearSnapshot}
          title="Clear snapshot A and exit compare mode"
          className={`${ACTION_BTN} hover:border-danger/40 hover:text-danger`}
        >
          <X size={13} aria-hidden="true" />
          Clear A
        </button>
      </span>
    </div>
  );
}
