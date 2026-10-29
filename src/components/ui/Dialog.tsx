import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import {
  Dialog as ShadcnDialog,
  DialogClose as ShadcnDialogClose,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogHeader as ShadcnDialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger as ShadcnDialogTrigger,
} from '../shadcn/dialog';
import { cn } from './utils';

export const Dialog = ShadcnDialog;
export const DialogTrigger = ShadcnDialogTrigger;
export const DialogClose = ShadcnDialogClose;
export { DialogOverlay, DialogPortal };

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ShadcnDialogContent
    {...props}
    ref={ref}
    showCloseButton={false}
    className={cn(
      'fixed left-1/2 top-1/2 z-50 block max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 text-text shadow-md outline-none dark:shadow-none sm:p-6',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 ease',
      className,
    )}
  >
    {children}
    <ShadcnDialogClose
      className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label="Tutup dialog"
    >
      <X className="h-4 w-4" />
    </ShadcnDialogClose>
  </ShadcnDialogContent>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <ShadcnDialogHeader className={cn('mb-4 space-y-1 pr-10 text-left', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <ShadcnDialogTitle className={cn('text-lg font-semibold text-text', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <ShadcnDialogDescription className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function DialogFooter({ className, children, ...props }: ComponentPropsWithoutRef<'div'> & { children: ReactNode }) {
  return (
    <ShadcnDialogFooter
      className={cn('mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
    </ShadcnDialogFooter>
  );
}
