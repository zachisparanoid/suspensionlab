/**
 * PromptInspector — full-transparency modal showing the exact prompt text
 * passed to the local Claude Code CLI (`claude -p`). Opened from the
 * SummaryPanel's inspect action; state lives in useSummaryStore.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, FileSearch2, X } from 'lucide-react';
import { useSummaryStore } from '../../store/useSummaryStore';
import { PANEL_EASE } from '../layout/Panel';
import { IconButton } from '../common/IconButton';

export function PromptInspector() {
  const open = useSummaryStore((s) => s.inspectorOpen);
  const promptUsed = useSummaryStore((s) => s.promptUsed);
  const setInspectorOpen = useSummaryStore((s) => s.setInspectorOpen);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  // Escape closes while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectorOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setInspectorOpen]);

  const handleCopy = () => {
    if (!promptUsed) return;
    navigator.clipboard
      .writeText(promptUsed)
      .then(() => {
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard blocked — nothing to flash */
      });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="prompt-inspector"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: PANEL_EASE }}
          onClick={() => setInspectorOpen(false)}
          aria-hidden={false}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Prompt sent to Claude Code"
            className="panel relative flex max-h-[80vh] w-[92vw] max-w-2xl flex-col"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: PANEL_EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-2 flex items-center gap-2">
              <FileSearch2 size={16} className="text-accent" aria-hidden="true" />
              <h2 className="flex-1 text-[14px] font-semibold text-ink">
                Prompt sent to Claude Code
              </h2>
              <IconButton label="Close prompt inspector" onClick={() => setInspectorOpen(false)} autoFocus>
                <X size={14} />
              </IconButton>
            </header>

            <p className="mb-3 text-[12.5px] text-ink-2">
              Full transparency: this exact text is passed to the local Claude Code CLI (claude -p)
              on your machine. Nothing else is sent, and it never leaves your computer except
              through your own Claude subscription.
            </p>

            <pre className="mono flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded-lg border border-edge bg-surface-2 p-4 text-[12px] leading-relaxed text-ink-2">
              {promptUsed}
            </pre>

            <footer className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy prompt'}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
