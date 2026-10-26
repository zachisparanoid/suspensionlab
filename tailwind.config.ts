import type { Config } from 'tailwindcss';

/**
 * SuspensionLab design tokens.
 * Colors are driven by CSS variables (see src/styles/index.css) so the
 * light/dark themes can swap without regenerating utility classes.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--c-base) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        edge: 'rgb(var(--c-edge) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-2': 'rgb(var(--c-accent-2) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'chart-a': 'rgb(var(--c-chart-a) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', fontWeight: '600' }],
        section: ['15px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.06em' }],
        stat: ['26px', { lineHeight: '30px', fontWeight: '600' }],
        unit: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        tip: ['12px', { lineHeight: '17px', fontWeight: '400' }],
      },
      borderRadius: {
        panel: '12px',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)',
        'panel-light': '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px rgba(15,23,42,0.08)',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
