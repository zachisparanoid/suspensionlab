/**
 * Minimal toast system: `toast('message')` from anywhere, optional action
 * button (used by the preset-load Undo). Non-blocking, auto-dismisses.
 */
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'info' | 'warn' | 'danger';
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.actionLabel ? 6000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, opts: Partial<Omit<ToastItem, 'id' | 'message'>> = {}) =>
  useToastStore.getState().push({ message, ...opts });

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[13px] shadow-panel ${
              t.tone === 'danger'
                ? 'border-danger/40 bg-surface text-danger'
                : t.tone === 'warn'
                  ? 'border-warn/40 bg-surface text-warn'
                  : 'border-edge bg-surface text-ink'
            }`}
            role="status"
          >
            {t.message}
            {t.actionLabel && (
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="text-ink-3 hover:text-ink"
              onClick={() => dismiss(t.id)}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
