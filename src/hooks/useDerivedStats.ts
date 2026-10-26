/**
 * Derived stats accessor. Computation lives in the config store (one derive
 * per change shared by all consumers); this hook is the ergonomic read path.
 */
import { useConfigStore } from '../store/useConfigStore';
import type { DerivedStats } from '../types';

export function useDerivedStats(): DerivedStats {
  return useConfigStore((s) => s.derived);
}
