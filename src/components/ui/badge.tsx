import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary shadow-[0_0_18px_rgba(56,189,248,0.12)] backdrop-blur transition-colors',
        className,
      )}
      {...props}
    />
  );
}
