import type { ComponentProps } from 'react';
import {
  Tabs as ShadcnTabs,
  TabsContent as ShadcnTabsContent,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
} from '../shadcn/tabs';
import { cn } from './utils';

export function Tabs({ className, ...props }: ComponentProps<typeof ShadcnTabs>) {
  return <ShadcnTabs {...props} className={cn('gap-0', className)} />;
}

export function TabsList({ className, variant, ...props }: ComponentProps<typeof ShadcnTabsList>) {
  return (
    <ShadcnTabsList
      {...props}
      variant={variant ?? 'default'}
      className={cn('inline-flex min-h-11 items-center gap-1 overflow-x-auto rounded-[10px] bg-surface-2 p-1', className)}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof ShadcnTabsTrigger>) {
  return (
    <ShadcnTabsTrigger
      {...props}
      className={cn(
        'inline-flex h-auto min-h-9 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-xs disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof ShadcnTabsContent>) {
  return <ShadcnTabsContent {...props} className={cn('mt-4 flex-none outline-none focus-visible:ring-2 focus-visible:ring-primary-500', className)} />;
}
