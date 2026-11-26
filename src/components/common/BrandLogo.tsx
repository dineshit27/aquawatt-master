import React from 'react';

export const AQUAWATT_LOGO_SRC = '/assets/aistudio/image_f360f0d9.png';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface BrandLogoProps {
  size?: BrandLogoSize;
  decorative?: boolean;
  alt?: string;
  className?: string;
  imgClassName?: string;
  showFrame?: boolean;
}

const SIZE_CLASSES: Record<BrandLogoSize, string> = {
  xs: 'w-6 h-6 p-0.5 rounded-md',
  sm: 'w-8 h-8 p-0.5 rounded-lg',
  md: 'w-9 h-9 p-0.5 rounded-xl',
  lg: 'w-11 h-11 p-1 rounded-xl',
  xl: 'w-14 h-14 p-1 rounded-2xl',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  decorative = false,
  alt = 'AW Solutions — AquaWatt Logo',
  className = '',
  imgClassName = '',
  showFrame = true,
}) => {
  const frameClasses = showFrame
    ? 'bg-white border border-slate-200/80 dark:border-white/15 shadow-xs'
    : '';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${SIZE_CLASSES[size]} ${frameClasses} ${className}`}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src={AQUAWATT_LOGO_SRC}
        alt={decorative ? '' : alt}
        decoding="async"
        className={`w-full h-full object-contain ${imgClassName}`}
      />
    </span>
  );
};

export default BrandLogo;
