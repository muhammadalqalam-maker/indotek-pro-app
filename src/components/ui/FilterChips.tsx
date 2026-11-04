import type { ReactNode } from 'react';
import { cn } from './utils';

export interface FilterChipOption<Value extends string> {
  value: Value;
  label: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
}

interface FilterChipsProps<Value extends string> {
  label: string;
  value: Value;
  options: readonly FilterChipOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string;
}

export function FilterChips<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
}: FilterChipsProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex min-h-11 w-fit max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-md bg-surface-2 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'bg-surface text-text shadow-xs'
                : 'text-muted-foreground hover:bg-surface hover:text-text',
            )}
          >
            {option.leading}
            {option.label}
            {option.trailing !== undefined && (
              <span className="text-xs tabular-nums text-muted-foreground">{option.trailing}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
