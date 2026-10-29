import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button as ShadcnButton } from '../shadcn/button';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const shadcnVariant = variant === 'primary' || variant === 'accent'
    ? 'default'
    : variant;

  return (
    <ShadcnButton
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      variant={shadcnVariant}
      size={size === 'md' ? 'default' : size}
      className={cn(
        'font-semibold',
        sizes[size],
        variant === 'accent' && 'bg-accent-500 text-text hover:bg-accent-600 focus-visible:ring-accent-500',
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </ShadcnButton>
  );
}
