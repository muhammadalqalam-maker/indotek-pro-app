import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function Input({ label, hint, error, prefix, suffix, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const messageId = inputId ? `${inputId}-message` : undefined;
  return (
    <div className="grid gap-1.5">
      {label && <label className="text-sm font-medium text-text" htmlFor={inputId}>{label}</label>}
      <div className={cn(
        'flex min-h-11 items-center gap-2 rounded-md border bg-surface px-3 text-base text-text transition focus-within:ring-2 focus-within:ring-primary-500',
        error ? 'border-danger' : 'border-border-strong',
      )}>
        {prefix && <span className="shrink-0 text-muted-foreground">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn('min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-50', className)}
          {...props}
        />
        {suffix && <span className="shrink-0 text-muted-foreground">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
