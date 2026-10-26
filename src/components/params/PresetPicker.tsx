/**
 * Preset dropdown: pick a vehicle archetype and load it into the store.
 * Loading is always undoable via the toast action (store keeps a pre-load
 * snapshot). Shows "Custom" once any param diverges from a preset.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Armchair,
  Car,
  ChevronDown,
  Mountain,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PRESETS } from '../../data/presets';
import { useConfigStore } from '../../store/useConfigStore';
import { toast } from '../common/Toast';
import { Badge } from '../common/Badge';
import { PANEL_EASE } from '../layout/Panel';
import { usePrefersReducedMotion } from '../../hooks/useAnimationLoop';

/** Maps `preset.icon` names (strings in data) to actual lucide components. */
const PRESET_ICONS: Record<string, LucideIcon> = {
  Armchair,
  Car,
  Timer,
  Mountain,
  RotateCw,
  Zap,
  Sparkles,
};

export function PresetPicker() {
  const presetId = useConfigStore((s) => s.presetId);
  const loadPreset = useConfigStore((s) => s.loadPreset);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const current = presetId ? PRESETS.find((p) => p.id === presetId) : undefined;
  const CurrentIcon = (current && PRESET_ICONS[current.icon]) ?? SlidersHorizontal;

  // Move focus into the list when it opens so keyboard users land on options.
  useEffect(() => {
    if (open) listRef.current?.querySelector('button')?.focus();
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const select = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    loadPreset(id);
    close(true);
    toast(`Loaded ${preset.name}`, {
      actionLabel: 'Undo',
      onAction: () => useConfigStore.getState().undoPresetLoad(),
    });
  };

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Preset: ${current ? current.name : 'Custom'}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:border-accent/40"
      >
        <CurrentIcon size={15} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="max-w-[10rem] truncate">{current ? current.name : 'Custom'}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close preset menu"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => close(false)}
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            role="listbox"
            aria-label="Vehicle presets"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: PANEL_EASE }}
            className="scrollbar-thin absolute left-0 top-full z-50 mt-2 max-h-[26rem] w-80 overflow-y-auto rounded-panel border border-edge bg-surface p-1.5 shadow-panel"
          >
            {PRESETS.map((p) => {
              const Icon = PRESET_ICONS[p.icon] ?? Car;
              const active = p.id === presetId;
              return (
                <li key={p.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => select(p.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ${
                      active ? 'bg-accent/10' : 'hover:bg-surface-2'
                    }`}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={`mt-0.5 shrink-0 ${active ? 'text-accent' : 'text-ink-2'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[13px] font-medium ${active ? 'text-accent' : 'text-ink'}`}
                      >
                        {p.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-2">
                        {p.description}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <Badge key={t} tone={active ? 'accent' : 'neutral'}>
                            {t}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
