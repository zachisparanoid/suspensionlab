import { describe, expect, it } from 'vitest';
import {
  formatValue,
  formatWithUnit,
  fromDisplay,
  kindForUnit,
  toDisplay,
  unitLabel,
} from '../convert';

describe('conversions', () => {
  it('kg ↔ lb', () => {
    expect(toDisplay(100, 'mass', 'imperial')).toBeCloseTo(220.462, 2);
    expect(toDisplay(100, 'mass', 'si')).toBe(100);
  });
  it('N/mm ↔ lb/in', () => {
    expect(toDisplay(50, 'stiffness', 'imperial')).toBeCloseTo(285.5, 1);
  });
  it('N·m/deg ↔ ft·lb/deg', () => {
    expect(toDisplay(1000, 'rollStiffness', 'imperial')).toBeCloseTo(737.56, 1);
  });
  it('round-trips losslessly (SI → Imperial → SI)', () => {
    const kinds = ['mass', 'length', 'stiffness', 'damping', 'rollStiffness', 'force', 'speed'] as const;
    for (const kind of kinds) {
      for (const v of [0.01, 1, 45.7, 1234.5]) {
        const rt = fromDisplay(toDisplay(v, kind, 'imperial'), kind, 'imperial');
        expect(rt).toBeCloseTo(v, 9);
      }
    }
  });
  it('dimensionless kinds pass through untouched', () => {
    expect(toDisplay(1.5, 'frequency', 'imperial')).toBe(1.5);
    expect(toDisplay(-2, 'angle', 'imperial')).toBe(-2);
    expect(toDisplay(17, 'inches', 'imperial')).toBe(17);
  });
});

describe('formatValue', () => {
  it('renders em-dash for non-finite values', () => {
    expect(formatValue(NaN)).toBe('—');
    expect(formatValue(Infinity)).toBe('—');
    expect(formatValue(-Infinity)).toBe('—');
  });
  it('drops decimals on large numbers, keeps them on small', () => {
    expect(formatValue(1234.567, 2)).toBe('1,235');
    expect(formatValue(1.234, 2)).toBe('1.23');
  });
});

describe('labels & kinds', () => {
  it('maps SI unit strings to kinds', () => {
    expect(kindForUnit('N/mm')).toBe('stiffness');
    expect(kindForUnit('N·m/deg')).toBe('rollStiffness');
    expect(kindForUnit('%')).toBe('percent');
  });
  it('unit labels swap with the system', () => {
    expect(unitLabel('stiffness', 'si')).toBe('N/mm');
    expect(unitLabel('stiffness', 'imperial')).toBe('lb/in');
  });
  it('formatWithUnit composes conversion + label', () => {
    expect(formatWithUnit(50, 'N/mm', 'si', 0)).toBe('50 N/mm');
    expect(formatWithUnit(50, 'N/mm', 'imperial', 0)).toBe('286 lb/in');
  });
});
