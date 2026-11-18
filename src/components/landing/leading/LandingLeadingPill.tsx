import React from 'react';
import { cn } from '../../../lib/utils';

export type PillVariant = 'primary' | 'secondary' | 'emerald' | 'sky' | 'light';

export interface LandingLeadingPillProps {
  children: React.ReactNode;
  borderVariant?: PillVariant;
  textVariant?: PillVariant;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

const BORDER_VARIANTS: Record<PillVariant, string> = {
  primary:
    'border-[#174A8B]/30 bg-[#174A8B]/[0.07] dark:border-sky-400/35 dark:bg-sky-400/10',
  secondary:
    'border-[#237A57]/30 bg-[#237A57]/[0.07] dark:border-emerald-400/35 dark:bg-emerald-400/10',
  emerald:
    'border-[#237A57]/30 bg-[#237A57]/[0.07] dark:border-emerald-400/35 dark:bg-emerald-400/10',
  sky: 'border-sky-400/40 bg-sky-400/15',
  light: 'border-slate-900/15 bg-white/55 backdrop-blur-md shadow-xs',
};

const TEXT_VARIANTS: Record<PillVariant, string> = {
  primary: 'text-[#174A8B] dark:text-sky-300',
  secondary: 'text-[#237A57] dark:text-emerald-300',
  emerald: 'text-[#237A57] dark:text-emerald-300',
  sky: 'text-sky-300',
  light: 'text-slate-800',
};

const DOT_VARIANTS: Record<PillVariant, string> = {
  primary: 'bg-[#174A8B] dark:bg-sky-400',
  secondary: 'bg-[#237A57] dark:bg-emerald-400',
  emerald: 'bg-[#237A57] dark:bg-emerald-400',
  sky: 'bg-sky-400',
  light: 'bg-[#174A8B]',
};

export const LandingLeadingPill: React.FC<LandingLeadingPillProps> = ({
  children,
  borderVariant = 'primary',
  textVariant = 'primary',
  leftComponent,
  rightComponent,
  showDot = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-mono font-semibold tracking-wide transition-colors',
        BORDER_VARIANTS[borderVariant],
        TEXT_VARIANTS[textVariant],
        className
      )}
    >
      {leftComponent ??
        (showDot && (
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 rounded-full shrink-0',
              DOT_VARIANTS[textVariant]
            )}
          />
        ))}
      <span>{children}</span>
      {rightComponent}
    </div>
  );
};
