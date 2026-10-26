/**
 * Collapsible panel of ParamSliders for one parameter category, with the
 * expert-level params tucked behind an "Advanced" reveal so first-time users
 * see only the knobs that matter most.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { ParamCategory } from '../../types';
import { CATEGORY_LABELS, paramsForCategory } from '../../data/parameterMeta';
import { Panel, PANEL_EASE } from '../layout/Panel';
import { usePrefersReducedMotion } from '../../hooks/useAnimationLoop';
import { ParamSlider } from './ParamSlider';

/** Secondary categories start collapsed to keep the sidebar scannable. */
const DEFAULT_COLLAPSED: ReadonlySet<ParamCategory> = new Set<ParamCategory>([
  'geometry',
  'tires',
]);

interface ParamGroupProps {
  category: ParamCategory;
}

export function ParamGroup({ category }: ParamGroupProps) {
  const metas = paramsForCategory(category); // roadInput already excluded
  const basic = metas.filter((m) => !m.advanced);
  const advanced = metas.filter((m) => m.advanced);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Panel
      title={CATEGORY_LABELS[category]}
      collapsible
      defaultCollapsed={DEFAULT_COLLAPSED.has(category)}
    >
      <div className="flex flex-col">
        {basic.map((m) => (
          <ParamSlider key={m.key} meta={m} />
        ))}
      </div>
      {advanced.length > 0 && (
        <div className="mt-1 border-t border-edge pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 transition-colors duration-150 hover:text-ink-2"
          >
            <ChevronRight
              size={12}
              aria-hidden="true"
              className={`transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
            />
            Advanced
            <span className="font-normal normal-case tracking-normal">({advanced.length})</span>
          </button>
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2, ease: PANEL_EASE }}
                className="overflow-hidden"
              >
                <div className="flex flex-col">
                  {advanced.map((m) => (
                    <ParamSlider key={m.key} meta={m} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
