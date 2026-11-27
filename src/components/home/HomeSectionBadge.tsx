import React from 'react';
import { cn } from '../../lib/utils';

export interface HomeSectionBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
  surface?: 'default' | 'glass';
}

export const HomeSectionBadge: React.FC<HomeSectionBadgeProps> = ({
  children,
  icon = '🔥',
  className,
  textClassName,
  surface = 'default',
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center divide-x py-1 text-sm border rounded-full transition-colors',
        surface === 'glass'
          ? 'divide-gray-200/80 border-white/75 bg-white/85 backdrop-blur-md shadow-xs'
          : 'divide-gray-200 dark:divide-slate-700/80 border-gray-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/75',
        className
      )}
    >
      <span className="pr-2 pl-3 text-base leading-none select-none" aria-hidden="true">
        {icon}
      </span>
      <span
        className={cn(
          'pl-2.5 pr-4 bg-gradient-to-r from-rose-500 to-indigo-500 dark:from-rose-400 dark:to-indigo-400 font-medium bg-clip-text text-transparent whitespace-nowrap',
          surface === 'glass' && 'dark:from-rose-500 dark:to-indigo-500',
          textClassName
        )}
      >
        {children}
      </span>
    </div>
  );
};

export default HomeSectionBadge;
