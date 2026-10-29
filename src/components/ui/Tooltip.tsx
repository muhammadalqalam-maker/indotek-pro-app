import { forwardRef } from 'react';
import type { ComponentProps, ComponentPropsWithoutRef, ElementRef } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from '../shadcn/tooltip';
import { cn } from './utils';

export function TooltipProvider({ delayDuration = 700, ...props }: ComponentProps<typeof ShadcnTooltipProvider>) {
  return <ShadcnTooltipProvider delayDuration={delayDuration} {...props} />;
}

export const Tooltip = ShadcnTooltip;
export const TooltipTrigger = ShadcnTooltipTrigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <ShadcnTooltipContent
    {...props}
    ref={ref}
    sideOffset={sideOffset}
    showArrow={false}
    className={cn(
      'z-50 max-w-xs origin-[var(--radix-tooltip-content-transform-origin)] rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm duration-150 ease data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-out-to-top-2 data-[side=left]:slide-out-to-right-2 data-[side=right]:slide-out-to-left-2 data-[side=top]:slide-out-to-bottom-2',
      className,
    )}
  />
));
TooltipContent.displayName = 'TooltipContent';
