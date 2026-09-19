'use client';

import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[16px] border border-black/[0.06] shadow-ios-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('px-5 py-4 ios-hairline-b', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('px-5 py-4 ios-hairline-t bg-[#FAFAFA] rounded-b-[16px]', className)}
      {...props}
    >
      {children}
    </div>
  );
}
