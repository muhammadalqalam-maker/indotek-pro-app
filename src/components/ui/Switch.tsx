import { useId, useRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { Switch as ShadcnSwitch } from '../shadcn/switch';
import { cn } from './utils';

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
};

export function Switch({ checked, onCheckedChange, label, className, disabled, id, ...props }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const labelId = `${switchId}-label`;
  const switchRef = useRef<HTMLButtonElement>(null);
  const labelledBy = [props['aria-labelledby'], label ? labelId : undefined].filter(Boolean).join(' ') || undefined;

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Node && !switchRef.current?.contains(event.target)) {
      switchRef.current?.click();
    }
  };

  return (
    <div
      className="inline-flex min-h-11 items-center gap-3 text-left text-sm text-text"
      onClick={handleContainerClick}
    >
      <ShadcnSwitch
        {...props}
        ref={switchRef}
        id={switchId}
        type="button"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={props['aria-label']}
        aria-labelledby={labelledBy}
        className={cn(
          'data-[size=default]:h-6 data-[size=default]:w-11 data-[state=checked]:bg-primary-700 data-[state=unchecked]:bg-border-strong',
          className,
        )}
      />
      {label && <span id={labelId} className="cursor-pointer select-none">{label}</span>}
    </div>
  );
}
