import type { HTMLAttributes, ReactNode } from 'react';
import {
  Card as ShadcnCard,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from '../shadcn/card';
import { cn } from './utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ShadcnCard className={cn('gap-0 rounded-lg border-border bg-surface py-0 text-text shadow-xs dark:shadow-none', className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ShadcnCardHeader className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)} {...props} />;
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: 'h2' | 'h3' | 'h4';
};

export function CardTitle({ as: Heading = 'h3', className, ...props }: CardTitleProps) {
  return <ShadcnCardTitle as={Heading} className={cn('text-base font-semibold leading-snug text-text', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <ShadcnCardDescription as="p" className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ShadcnCardContent className={cn('px-4 pb-4 pt-0 sm:px-5 sm:pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ShadcnCardFooter className={cn('flex items-center gap-2 px-4 pb-4 pt-0 sm:px-5 sm:pb-5', className)} {...props} />;
}

export function CardSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section data-slot="card-section" className={cn('p-4 sm:p-5', className)}>{children}</section>;
}
