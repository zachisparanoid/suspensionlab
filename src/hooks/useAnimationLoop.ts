/**
 * rAF loop for the live schematic animation.
 * - Pauses when the tab is hidden (visibilitychange).
 * - Disabled entirely under prefers-reduced-motion (callback runs once with
 *   dt=0 so components can render a static deflected pose).
 * - Clamps dt so a background tab returning doesn't explode the integrator.
 */
import { useEffect, useRef } from 'react';

export function usePrefersReducedMotion(): boolean {
  const ref = useRef<boolean>(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return ref.current;
}

export function useAnimationLoop(callback: (dtSeconds: number, elapsed: number) => void): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      cbRef.current(0, 0);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05); // clamp long gaps
      last = now;
      elapsed += dt;
      cbRef.current(dt, elapsed);
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);
}
