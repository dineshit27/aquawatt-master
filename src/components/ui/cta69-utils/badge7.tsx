import React from 'react';
import { cn } from '../../../lib/utils';

export interface Badge7Props {
  label: string;
  className?: string;
}

export function Badge7({ label, className }: Badge7Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3.5 py-1.5 text-xs font-medium tracking-wide text-foreground shadow-2xs backdrop-blur-xs',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export default Badge7;
