import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent,
  OptgroupHTMLAttributes,
  OptionHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../shadcn/select';
import { cn } from './utils';

type NativeOption = OptionHTMLAttributes<HTMLOptionElement>;
type NativeOptgroup = OptgroupHTMLAttributes<HTMLOptGroupElement>;
type SelectChoice = { value: string; selected: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

function getTextContent(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return getTextContent(child.props.children);
    return '';
  }).join('');
}

function getOptionValue(option: NativeOption): string {
  return option.value === undefined ? getTextContent(option.children) : String(option.value);
}

function collectChoices(children: ReactNode): SelectChoice[] {
  const choices: SelectChoice[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement<NativeOption>(child) && child.type === 'option') {
      choices.push({
        value: getOptionValue(child.props),
        selected: Boolean(child.props.selected),
      });
    } else if (isValidElement<NativeOptgroup>(child) && child.type === 'optgroup') {
      choices.push(...collectChoices(child.props.children));
    }
  });

  return choices;
}

function getEmptyItemValue(choices: SelectChoice[]): string {
  let value = '__indotek_empty_select__';
  while (choices.some((choice) => choice.value === value)) value += '_';
  return value;
}

function renderOptions(children: ReactNode, emptyValue: string, groupDisabled = false): ReactNode {
  return Children.map(children, (child, index) => {
    if (isValidElement<NativeOption>(child) && child.type === 'option') {
      const optionValue = getOptionValue(child.props);
      return (
        <SelectItem
          key={child.key ?? `option-${index}`}
          value={optionValue === '' ? emptyValue : optionValue}
          disabled={groupDisabled || Boolean(child.props.disabled)}
        >
          {child.props.children}
        </SelectItem>
      );
    }

    if (isValidElement<NativeOptgroup>(child) && child.type === 'optgroup') {
      return (
        <SelectGroup key={child.key ?? `group-${index}`}>
          {child.props.label && <SelectLabel>{child.props.label}</SelectLabel>}
          {renderOptions(child.props.children, emptyValue, groupDisabled || Boolean(child.props.disabled))}
        </SelectGroup>
      );
    }

    return null;
  });
}

function setNativeValue(select: HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function dispatchFocusEvent(select: HTMLSelectElement, type: 'focusin' | 'focusout', relatedTarget?: EventTarget | null): void {
  select.dispatchEvent(new FocusEvent(type, { bubbles: true, relatedTarget }));
}

function SelectMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return <p id={id} className={cn('text-xs', error ? 'text-danger' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>{error || hint}</p>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(props, ref) {
  const generatedId = useId();
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const {
    label,
    hint,
    error,
    id,
    className,
    children,
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    onInvalid,
    disabled,
    required,
    multiple,
    size,
    form,
    autoFocus,
    tabIndex,
    title,
    style,
    dir,
    ...nativeProps
  } = props;
  const selectId = id ?? name ?? generatedId;
  const messageId = `${selectId}-message`;
  const choices = useMemo(() => collectChoices(children), [children]);
  const hasEmptyChoice = choices.some((choice) => choice.value === '');
  const emptyValue = useMemo(() => getEmptyItemValue(choices), [choices]);
  const initialValue = value ?? defaultValue ?? choices.find((choice) => choice.selected)?.value ?? choices[0]?.value ?? '';
  const normalizeValue = (selectedValue: string | number | readonly string[] | undefined) => {
    if (Array.isArray(selectedValue)) return selectedValue[0] === undefined ? '' : String(selectedValue[0]);
    return selectedValue === undefined ? '' : String(selectedValue);
  };
  const encodeValue = (selectedValue: string) => selectedValue === '' && hasEmptyChoice ? emptyValue : selectedValue;
  const decodeValue = (selectedValue: string) => selectedValue === emptyValue && hasEmptyChoice ? '' : selectedValue;
  const [uncontrolledValue, setUncontrolledValue] = useState(() => encodeValue(normalizeValue(initialValue)));
  const selectedValue = value === undefined ? uncontrolledValue : encodeValue(normalizeValue(value));

  useImperativeHandle(ref, () => {
    const select = nativeSelectRef.current;
    if (!select) throw new Error('Select ref is unavailable before the component is mounted.');
    return select;
  }, []);

  useEffect(() => {
    if (value === undefined && nativeSelectRef.current) {
      setUncontrolledValue(encodeValue(nativeSelectRef.current.value));
    }
  }, [children, defaultValue, emptyValue, value]);

  const handleValueChange = (nextValue: string) => {
    const nextNativeValue = decodeValue(nextValue);
    if (value === undefined) setUncontrolledValue(nextValue);
    if (nativeSelectRef.current && nativeSelectRef.current.value !== nextNativeValue) {
      setNativeValue(nativeSelectRef.current, nextNativeValue);
    }
  };

  const handleNativeFocus = (event: FocusEvent<HTMLSelectElement>) => {
    onFocus?.(event);
    if (document.activeElement === event.currentTarget) triggerRef.current?.focus();
  };

  const handleTriggerFocus = () => {
    if (nativeSelectRef.current) dispatchFocusEvent(nativeSelectRef.current, 'focusin');
  };

  const handleTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (nativeSelectRef.current) {
      dispatchFocusEvent(nativeSelectRef.current, 'focusout', event.relatedTarget);
    }
  };

  const nativeSelect = (
    <select
      {...nativeProps}
      ref={nativeSelectRef}
      name={name}
      form={form}
      disabled={disabled}
      required={required}
      multiple={multiple}
      size={size}
      value={value === undefined ? undefined : normalizeValue(value)}
      defaultValue={value === undefined ? normalizeValue(initialValue) : undefined}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={handleNativeFocus}
      onInvalid={onInvalid}
      className="sr-only"
      aria-hidden="true"
      tabIndex={-1}
    >
      {children}
    </select>
  );

  if (multiple || (size !== undefined && size > 1)) {
    return (
      <div className="grid gap-1.5">
        {label && <label className="text-sm font-medium text-text" htmlFor={selectId}>{label}</label>}
        <select
          {...nativeProps}
          ref={nativeSelectRef}
          id={selectId}
          name={name}
          form={form}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onInvalid={onInvalid}
          disabled={disabled}
          required={required}
          multiple={multiple}
          size={size}
          aria-invalid={Boolean(error) || props['aria-invalid']}
          aria-describedby={props['aria-describedby'] ?? (error || hint ? messageId : undefined)}
          className={cn(
            'min-h-11 w-full rounded-md border bg-surface px-3 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger' : 'border-border-strong',
            className,
          )}
        >
          {children}
        </select>
        <SelectMessage id={messageId} error={error} hint={hint} />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      {label && <label className="text-sm font-medium text-text" htmlFor={selectId}>{label}</label>}
      {nativeSelect}
      <ShadcnSelect
        value={selectedValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        dir={dir === 'ltr' || dir === 'rtl' ? dir : undefined}
      >
        <SelectTrigger
          ref={triggerRef}
          id={selectId}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          title={title}
          style={style}
          disabled={disabled}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={props['aria-describedby'] ?? (error || hint ? messageId : undefined)}
          aria-required={required || props['aria-required']}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          className={cn(
            'min-h-11 w-full border-border-strong bg-surface text-base text-text focus-visible:ring-2 focus-visible:ring-primary-500',
            error && 'border-danger',
            className,
          )}
          onFocus={handleTriggerFocus}
          onBlur={handleTriggerBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {renderOptions(children, emptyValue)}
        </SelectContent>
      </ShadcnSelect>
      <SelectMessage id={messageId} error={error} hint={hint} />
    </div>
  );
});
