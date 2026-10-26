/**
 * Lightweight, keyboard-accessible tooltip. Opens on hover AND focus, closes
 * on blur/escape. Positioned above by default, flips below near the top edge.
 */
import { useId, useRef, useState, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** Max width in px. */
  width?: number;
  side?: 'top' | 'bottom';
}

export function Tooltip({ content, children, width = 280, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  const show = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    setFlip(side === 'top' && (rect?.top ?? 200) < 140);
    setOpen(true);
  };

  const below = side === 'bottom' || flip;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          style={{ width: `min(${width}px, 80vw)` }}
          className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-lg border border-edge bg-surface-2 px-3 py-2 text-tip text-ink shadow-panel ${
            below ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
