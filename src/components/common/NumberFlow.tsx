/**
 * Animated numeric display: tweens toward the target value over ~350 ms with
 * tabular figures so digits don't jitter. Skips animation under
 * prefers-reduced-motion and renders an em-dash for non-finite values.
 */
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useAnimationLoop';
import { formatValue } from '../../units/convert';

interface NumberFlowProps {
  value: number;
  decimals?: number;
  className?: string;
  /** Set true while the user is actively scrubbing to track directly (no tween). */
  immediate?: boolean;
}

const TWEEN_MS = 350;

export function NumberFlow({ value, decimals = 2, className, immediate = false }: NumberFlowProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced || immediate || !Number.isFinite(value) || !Number.isFinite(fromRef.current)) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / TWEEN_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (value - from) * eased;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduced, immediate]);

  return (
    <span className={`tabular ${className ?? ''}`}>
      {formatValue(immediate || reduced ? value : display, decimals)}
    </span>
  );
}
