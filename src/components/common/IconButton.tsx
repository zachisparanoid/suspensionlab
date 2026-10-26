import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}

/** Icon-only button with an accessible label and hover/active states. */
export function IconButton({
  label,
  children,
  active = false,
  size = 'md',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg border transition-colors duration-150 ${
        size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
      } ${
        active
          ? 'border-accent/40 bg-accent/15 text-accent'
          : 'border-transparent text-ink-2 hover:border-edge hover:bg-surface-2 hover:text-ink'
      } disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
