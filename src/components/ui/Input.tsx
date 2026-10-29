import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Input as ShadcnInput } from '../shadcn/input';
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
        <ShadcnInput
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none outline-none placeholder:text-subtle focus-visible:border-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
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
