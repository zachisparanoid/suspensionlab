/**
 * Save/Load popover: persist named setups, rename/delete them inline, and
 * exchange them as JSON files (import is validated + clamped — never trust
 * a file).
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderDown, Pencil, Trash2 } from 'lucide-react';
import type { SavedConfig, SuspensionParams } from '../../types';
import { sanitizeParams, useConfigStore } from '../../store/useConfigStore';
import { usePrefersReducedMotion } from '../../hooks/useAnimationLoop';
import { IconButton } from '../common/IconButton';
import { toast } from '../common/Toast';
import { PANEL_EASE } from './Panel';

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

/**
 * Parse an imported JSON file into fresh SavedConfigs.
 * Returns null (import NOTHING) unless the whole file is a valid array of
 * `{ name: string, params: object }` items. Params are clamped through
 * `sanitizeParams` so hostile values can never reach the physics.
 */
function parseImport(text: string): SavedConfig[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const base = useConfigStore.getState().params;
  const out: SavedConfig[] = [];
  for (const item of parsed as unknown[]) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
    const rec = item as Record<string, unknown>;
    if (typeof rec.name !== 'string') return null;
    if (typeof rec.params !== 'object' || rec.params === null || Array.isArray(rec.params)) {
      return null;
    }
    const now = Date.now();
    out.push({
      id: crypto.randomUUID(),
      name: rec.name,
      params: sanitizeParams(rec.params as Partial<SuspensionParams>, base),
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

export function SaveLoadMenu() {
  const savedConfigs = useConfigStore((s) => s.savedConfigs);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const renameConfig = useConfigStore((s) => s.renameConfig);
  const deleteConfig = useConfigStore((s) => s.deleteConfig);
  const importConfigs = useConfigStore((s) => s.importConfigs);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [armedId, setArmedId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = usePrefersReducedMotion();

  // Close on Escape and on any click outside the popover.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );

  const submitSave = () => {
    saveConfig(name);
    toast('Saved');
    setName('');
  };

  const commitRename = () => {
    if (editingId) renameConfig(editingId, editValue);
    setEditingId(null);
  };

  const onDelete = (cfg: SavedConfig) => {
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    if (armedId === cfg.id) {
      setArmedId(null);
      deleteConfig(cfg.id);
      return;
    }
    setArmedId(cfg.id);
    disarmTimer.current = setTimeout(() => setArmedId(null), 2000);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(savedConfigs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suspensionlab-configs.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    file
      .text()
      .then((text) => {
        const list = parseImport(text);
        if (!list) {
          toast('Invalid config file — nothing imported', { tone: 'danger' });
          return;
        }
        importConfigs(list);
        toast(`Imported ${list.length} setup${list.length === 1 ? '' : 's'}`);
      })
      .catch(() => toast('Invalid config file — nothing imported', { tone: 'danger' }));
  };

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label="Save & load setups"
        active={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <FolderDown size={16} aria-hidden="true" />
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: PANEL_EASE }}
            role="dialog"
            aria-label="Save and load setups"
            className="panel absolute right-0 top-10 z-50 w-80"
          >
            <p className="section-title mb-2">Save current setup</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitSave();
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Setup name"
                aria-label="Setup name"
                className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-3"
              />
              <button
                type="submit"
                className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/25"
              >
                Save
              </button>
            </form>

            <div className="my-3 h-px bg-edge" role="separator" />

            {savedConfigs.length === 0 ? (
              <p className="px-1 text-[12px] text-ink-3">
                No saved setups yet — name the current one above.
              </p>
            ) : (
              <ul className="scrollbar-thin -mr-2 max-h-64 space-y-0.5 overflow-y-auto pr-2">
                {savedConfigs.map((cfg) => (
                  <li
                    key={cfg.id}
                    className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      {editingId === cfg.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              setEditingId(null);
                            }
                          }}
                          aria-label={`Rename ${cfg.name}`}
                          className="w-full rounded-md border border-edge bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink"
                        />
                      ) : (
                        <p className="truncate text-[13px] font-medium text-ink">{cfg.name}</p>
                      )}
                      <p className="text-[11px] text-ink-3">{relTime(cfg.updatedAt)}</p>
                    </div>

                    <IconButton
                      size="sm"
                      label={`Rename ${cfg.name}`}
                      onClick={() => {
                        setEditingId(cfg.id);
                        setEditValue(cfg.name);
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" />
                    </IconButton>

                    <button
                      type="button"
                      onClick={() => {
                        loadConfig(cfg.id);
                        toast(`Loaded “${cfg.name}”`);
                      }}
                      aria-label={`Load ${cfg.name}`}
                      className="rounded-md border border-edge bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(cfg)}
                      aria-label={
                        armedId === cfg.id
                          ? `Confirm delete ${cfg.name}`
                          : `Delete ${cfg.name}`
                      }
                      title={armedId === cfg.id ? 'Click again to confirm' : `Delete ${cfg.name}`}
                      className={`inline-flex h-6 items-center gap-1 rounded-md px-1 text-[11px] transition-colors ${
                        armedId === cfg.id ? 'text-danger' : 'text-ink-3 hover:text-danger'
                      }`}
                    >
                      {armedId === cfg.id && <span className="font-semibold">sure?</span>}
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-edge pt-3">
              <button
                type="button"
                onClick={exportJson}
                className="text-[12px] font-medium text-ink-2 transition-colors hover:text-accent"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[12px] font-medium text-ink-2 transition-colors hover:text-accent"
              >
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={onImportFile}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
