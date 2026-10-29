import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, InputHTMLAttributes } from 'react';
import { Checkbox as ShadcnCheckbox } from '../shadcn/checkbox';
import { cn } from './utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  indeterminate?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
  const {
    label,
    id,
    className,
    indeterminate = false,
    checked,
    defaultChecked,
    name,
    value,
    form,
    required,
    disabled,
    onChange,
    onBlur,
    onFocus,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    ...nativeProps
  } = props;
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const labelId = `${inputId}-label`;
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const isForwardingFocus = useRef(false);
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked ?? false);
  const selectedState = indeterminate ? 'indeterminate' : checked ?? uncontrolledChecked;
  const labelledBy = [ariaLabelledBy, label ? labelId : undefined].filter(Boolean).join(' ') || undefined;

  useImperativeHandle(ref, () => {
    const input = nativeInputRef.current;
    if (!input) throw new Error('Checkbox ref is unavailable before the component is mounted.');
    return input;
  }, []);

  useEffect(() => {
    if (nativeInputRef.current) nativeInputRef.current.indeterminate = selectedState === 'indeterminate';
  }, [selectedState]);

  const handleNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (checked === undefined && !indeterminate) setUncontrolledChecked(event.currentTarget.checked);
    onChange?.(event);
  };

  const handleNativeFocus = (event: FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    if (document.activeElement === event.currentTarget && checkboxRef.current) {
      isForwardingFocus.current = true;
      checkboxRef.current.focus();
      isForwardingFocus.current = false;
    }
  };

  const handleCheckboxChange = (nextValue: boolean | 'indeterminate') => {
    const input = nativeInputRef.current;
    if (input && (input.checked !== (nextValue === true) || input.indeterminate)) input.click();
  };

  const handleCheckboxFocus = () => {
    if (!isForwardingFocus.current && nativeInputRef.current) {
      nativeInputRef.current.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    }
  };

  const handleCheckboxBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (!isForwardingFocus.current && nativeInputRef.current) {
      nativeInputRef.current.dispatchEvent(new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: event.relatedTarget,
      }));
    }
  };

  const control = (
    <>
      <input
        {...nativeProps}
        ref={nativeInputRef}
        id={`${inputId}-native`}
        type="checkbox"
        name={name}
        value={value}
        form={form}
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        required={required}
        disabled={disabled}
        onChange={handleNativeChange}
        onBlur={onBlur}
        onFocus={handleNativeFocus}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <ShadcnCheckbox
        ref={checkboxRef}
        id={inputId}
        checked={selectedState}
        onCheckedChange={handleCheckboxChange}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required || ariaRequired}
        className={cn(
          'group size-5 shrink-0 rounded-[6px] border-border-strong bg-surface text-white data-[state=checked]:border-primary-700 data-[state=checked]:bg-primary-700 data-[state=indeterminate]:border-primary-700 data-[state=indeterminate]:bg-primary-700 focus-visible:border-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500',
          className,
        )}
        onFocus={handleCheckboxFocus}
        onBlur={handleCheckboxBlur}
      />
    </>
  );

  if (!label) return <div className="inline-flex min-h-11 items-center gap-2">{control}</div>;

  return (
    <label htmlFor={`${inputId}-native`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
      {control}
      <span id={labelId}>{label}</span>
    </label>
  );
});
