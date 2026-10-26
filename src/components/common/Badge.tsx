import type { ReactNode } from 'react';

type Tone = 'accent' | 'accent2' | 'warn' | 'danger' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  accent: 'bg-accent/15 text-accent border-accent/30',
  accent2: 'bg-accent-2/15 text-accent-2 border-accent-2/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-ink-3/15 text-ink-2 border-ink-3/30',
};

export function Badge({
  tone = 'neutral',
  children,
  pulse = false,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${TONE_CLASSES[tone]} ${pulse ? 'danger-pulse' : ''} ${className}`}
    >
      {children}
    </span>
  );
}
