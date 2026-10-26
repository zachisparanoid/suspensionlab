/** Two-state segmented toggle (units, theme, etc.) — keyboard accessible. */

interface ToggleProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  ariaLabel: string;
}

export function Toggle<T extends string>({ value, options, onChange, ariaLabel }: ToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-edge bg-surface-2 p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
            value === opt.value
              ? 'bg-accent/20 text-accent'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
