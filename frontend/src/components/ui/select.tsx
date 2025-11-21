import { cn } from '../../lib/utils';
import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
