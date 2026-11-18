import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'critical' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-[#174A8B]/10 text-[#174A8B] border-[#174A8B]/20 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    success: 'bg-[#237A57]/10 text-[#237A57] border-[#237A57]/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    critical: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    primary: 'bg-[#174A8B] dark:bg-sky-400',
    success: 'bg-[#237A57] dark:bg-emerald-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    critical: 'bg-rose-500 dark:bg-rose-400',
    neutral: 'bg-slate-400 dark:bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 tracking-wide',
    md: 'text-xs px-2.5 py-1 tracking-normal',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
