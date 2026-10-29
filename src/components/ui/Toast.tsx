import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { commonMessages } from '../../i18n/id';
import { cn } from './utils';

export type ToastVariant = 'success' | 'error' | 'info';
type ToastAction = { label: string; onClick: () => void };
type ToastInput = { title: string; description?: string; variant?: ToastVariant; action?: ToastAction };
type ToastItem = ToastInput & { id: number; state: 'open' | 'closed' };
type ToastContextValue = { toast: (input: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const messages = commonMessages;
const TOAST_EXIT_DURATION = 400;
const variantClasses: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success-bg text-success',
  error: 'border-danger/30 bg-danger-bg text-danger',
  info: 'border-info/30 bg-info-bg text-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const exitTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    if (exitTimers.current.has(id)) return;
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);

    setItems((previous) => previous.map((item) => (
      item.id === id ? { ...item, state: 'closed' } : item
    )));
    const exitDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : TOAST_EXIT_DURATION;
    exitTimers.current.set(id, setTimeout(() => {
      setItems((previous) => previous.filter((item) => item.id !== id));
      exitTimers.current.delete(id);
    }, exitDuration));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    setItems((previous) => [...previous, {
      ...input,
      variant: input.variant ?? 'info',
      id,
      state: 'open' as const,
    }].slice(-5));
    timers.current.set(id, setTimeout(() => dismiss(id), 5000));
  }, [dismiss]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    for (const timer of exitTimers.current.values()) clearTimeout(timer);
    timers.current.clear();
    exitTimers.current.clear();
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 max-sm:left-1/2 max-sm:right-auto max-sm:w-[min(24rem,calc(100vw-2rem))] max-sm:-translate-x-1/2" aria-live="polite" aria-relevant="additions">
        {items.map((item) => {
          const Icon = item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? AlertCircle : Info;
          return (
            <div
              key={item.id}
              data-state={item.state}
              role={item.variant === 'error' ? 'alert' : 'status'}
              className={cn('toast-motion pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-md', variantClasses[item.variant ?? 'info'])}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && <p className="mt-0.5 text-xs opacity-90">{item.description}</p>}
                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      dismiss(item.id);
                      item.action?.onClick();
                    }}
                    className="mt-2 min-h-12 rounded-md px-2 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current sm:min-h-8"
                  >
                    {item.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismiss(item.id)} className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-md hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0" aria-label={messages.close}>
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider.');
  return context;
}
