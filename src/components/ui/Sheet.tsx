import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import {
  Sheet as ShadcnSheet,
  SheetClose as ShadcnSheetClose,
  SheetContent as ShadcnSheetContent,
  SheetTrigger as ShadcnSheetTrigger,
} from '../shadcn/sheet';
import { cn } from './utils';

export const Sheet = ShadcnSheet;
export const SheetTrigger = ShadcnSheetTrigger;
export const SheetClose = ShadcnSheetClose;
export const SheetContent = forwardRef<
  ElementRef<typeof SheetPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }
>(({ className, children, side = 'bottom', ...props }, ref) => (
  <ShadcnSheetContent
    {...props}
    ref={ref}
    side={side}
    showCloseButton={false}
    className={cn(
      'fixed z-50 overflow-y-auto border border-border bg-surface p-5 text-text shadow-lg outline-none dark:shadow-none',
      'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500 ease-in-out',
      side === 'left'
        ? 'left-0 top-0 h-full w-[min(20rem,85vw)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left'
        : side === 'right'
          ? 'right-0 top-0 h-full w-[min(20rem,85vw)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
          : 'bottom-0 left-0 max-h-[90dvh] w-full rounded-t-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:left-1/2 sm:right-auto sm:w-[min(100%-2rem,36rem)] sm:max-w-none sm:-translate-x-1/2',
      className,
    )}
  >
    {children}
  </ShadcnSheetContent>
));
SheetContent.displayName = 'SheetContent';
