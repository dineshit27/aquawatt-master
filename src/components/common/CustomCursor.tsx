import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Only enable custom cursor for precise fine pointers (desktop mouse)
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      setIsSupported(true);
    } else {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], [data-interactive="true"]');
        setIsPointer(!!isInteractive);
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, [isVisible]);

  if (!isSupported || !isVisible) return null;

  return (
    <>
      {/* Precision center dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-[#174A8B] dark:bg-sky-400 pointer-events-none z-[9999] transition-transform duration-75 ease-out -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${isPointer ? 1.5 : 1})`,
        }}
      />
      {/* Precision subtle outer reticle */}
      <div
        className={`fixed top-0 left-0 rounded-full border pointer-events-none z-[9998] transition-all duration-150 ease-out -translate-x-1/2 -translate-y-1/2 ${
          isPointer
            ? 'w-9 h-9 border-[#237A57] bg-[#237A57]/10 dark:border-emerald-400 dark:bg-emerald-400/10'
            : 'w-6 h-6 border-[#174A8B]/30 dark:border-sky-400/30'
        }`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      />
    </>
  );
};
