import type { TextareaHTMLAttributes } from 'react';
import { cn } from './utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, id, className, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  const messageId = textareaId ? `${textareaId}-message` : undefined;
  return (
    <div className="grid gap-1.5">
      {label && <label className="text-sm font-medium text-text" htmlFor={textareaId}>{label}</label>}
      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'min-h-24 w-full rounded-md border bg-surface px-3 py-2.5 text-base text-text outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
