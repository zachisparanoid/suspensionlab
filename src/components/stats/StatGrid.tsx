/**
 * Right-column "Derived Stats" panel: live warnings (wheel lift, degenerate
 * inputs) followed by every derived stat, grouped into labelled sections of
 * compact StatCards. All content is store-driven — the layout comes straight
 * from STAT_META order.
 */
import { Panel } from '../layout/Panel';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { StatCard } from './StatCard';
import { useDerived, useParams } from '../../store/useConfigStore';
import { STAT_META } from '../../data/statMeta';
import { PARAM_META } from '../../data/parameterMeta';
import { formatValue } from '../../units/convert';
import type { StatMeta } from '../../types';

const SECTIONS: Array<{ title: string; group: StatMeta['group'] }> = [
  { title: 'Ride & Damping', group: 'ride' },
  { title: 'Roll & Pitch', group: 'roll' },
  { title: 'Load Transfer', group: 'loads' },
  { title: 'Character', group: 'balance' },
  { title: 'Fitment & Stance', group: 'fitment' },
];

const WHEEL_LIFT_TOOLTIP =
  'Lateral load transfer has unloaded the inside tire completely — its dynamic ' +
  'corner load reached zero, so it is off the ground (or nearly so). Past this ' +
  'point that tire contributes no grip and the car is balancing on three wheels. ' +
  'Reduce cornering g, lower the centre of gravity, widen the track, or soften ' +
  'roll stiffness on this axle.';

export function StatGrid() {
  const derived = useDerived();
  const params = useParams();

  const hasAlerts = derived.wheelLift || derived.warnings.length > 0;

  return (
    <Panel
      title="Derived Stats"
      actions={
        <span className="flex items-center gap-1">
          <span className="h-[2px] w-[2px] rounded-full bg-accent" aria-hidden="true" />
          <span className="text-[10px] text-ink-3">live</span>
        </span>
      }
    >
      {hasAlerts && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="status">
          {derived.wheelLift && (
            <Tooltip content={WHEEL_LIFT_TOOLTIP}>
              <span tabIndex={0} className="inline-flex rounded-md" aria-label="Wheel lift warning">
                <Badge tone="danger" pulse>
                  Inside wheel lifting at{' '}
                  {formatValue(params.lateralG, PARAM_META.lateralG.decimals ?? 2)}g
                </Badge>
              </span>
            </Tooltip>
          )}
          {derived.warnings.map((warning) => (
            <Badge key={warning} tone="warn">
              {warning}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {SECTIONS.map(({ title, group }) => {
          const stats = STAT_META.filter((m) => m.group === group);
          if (stats.length === 0) return null;
          return (
            <section key={group} aria-label={title}>
              <h3 className="section-title mb-2">{title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {stats.map((meta) => (
                  <StatCard key={meta.key} meta={meta} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
