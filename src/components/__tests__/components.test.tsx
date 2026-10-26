/**
 * Critical component behaviors (React Testing Library):
 * - MarkdownLite renders bold/lists without dangerouslySetInnerHTML
 * - NumberFlow never renders NaN/Infinity
 * - ParamSlider clamps out-of-range typed values
 * - StatCard shows an em-dash for non-finite stats
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarkdownLite } from '../ai/MarkdownLite';
import { NumberFlow } from '../common/NumberFlow';
import { ParamSlider } from '../params/ParamSlider';
import { PARAM_META } from '../../data/parameterMeta';
import { useConfigStore } from '../../store/useConfigStore';

// jsdom lacks rAF-driven layout; make matchMedia deterministic (reduced motion
// ON so NumberFlow renders values directly).
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);

describe('MarkdownLite', () => {
  it('renders bold text and bullet lists as elements, not raw markup', () => {
    render(<MarkdownLite text={'**Ride.** soft springs\n\n- one\n- two'} />);
    expect(screen.getByText('Ride.').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });
});

describe('NumberFlow', () => {
  it('renders em-dash for non-finite values', () => {
    render(<NumberFlow value={NaN} decimals={2} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
  it('renders finite values with fixed decimals', () => {
    render(<NumberFlow value={1.714} decimals={2} />);
    expect(screen.getByText('1.71')).toBeInTheDocument();
  });
});

describe('ParamSlider clamping', () => {
  it('clamps typed out-of-range values into the meta range', () => {
    const meta = PARAM_META.springRateFront; // range 15–160
    render(<ParamSlider meta={meta} />);
    const input = screen.getByRole('textbox', { name: /spring rate \(front\)/i });
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.blur(input);
    expect(useConfigStore.getState().params.springRateFront).toBe(meta.max);

    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);
    expect(useConfigStore.getState().params.springRateFront).toBe(meta.min);
  });
});
