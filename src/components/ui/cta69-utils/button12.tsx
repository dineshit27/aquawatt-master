import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface Button12Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  asChild?: boolean;
  children?: React.ReactElement<Record<string, unknown>>;
}

export function Button12({
  label,
  asChild = false,
  children,
  className,
  ...props
}: Button12Props) {
  const classes = cn(
    'group inline-flex items-center justify-center gap-2.5 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0',
    className,
  );

  const content = (
    <>
      <span>{label}</span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/15 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </>
  );

  if (asChild && React.isValidElement(children)) {
    const childClassName =
      typeof children.props.className === 'string'
        ? children.props.className
        : undefined;

    return React.cloneElement(
      children,
      {
        ...props,
        className: cn(classes, childClassName),
      },
      content,
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
}

export default Button12;
