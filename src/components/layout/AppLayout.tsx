import React from 'react';
import { AppSidebar } from '../navigation/AppSidebar';
import { AppHeader } from '../navigation/AppHeader';
import { Footer } from '../navigation/Footer';
import { ToastContainer } from '../common/ToastContainer';
import { ScrollProgress } from '../common/ScrollProgress';
import { useTheme } from '../../context/ThemeContext';

interface AppLayoutProps {
  children: React.ReactNode;
  hero?: React.ReactNode;
  cta?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  hero,
  cta,
  title,
  subtitle,
}) => {
  const { theme, palette, showGridOverlay } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      data-aw-surface-palette={palette}
      className="min-h-screen flex flex-col bg-[var(--aw-canvas)] dark:bg-[#070B13] text-[#17263F] dark:text-[#E2E8F0] selection:bg-[#174A8B] selection:text-white transition-colors"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#174A8B] focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <ScrollProgress />
      <ToastContainer />

      {showGridOverlay && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-40 flex justify-center md:pl-[72px]"
        >
          <div className="max-w-7xl w-full h-full px-4 sm:px-6 lg:px-8 grid grid-cols-12 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="h-full border-x"
                style={{
                  borderColor: isDark ? 'rgba(56, 189, 248, 0.16)' : 'var(--aw-accent-ring)',
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.035)' : 'var(--aw-accent-soft)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Sticky Vertical Sidebar */}
        <div className="hidden md:block shrink-0 sticky top-0 h-screen z-30">
          <AppSidebar />
        </div>

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar */}
          <AppHeader title={title} subtitle={subtitle} />

          {/* Optional Uncompressed Full-Width Hero */}
          {hero && <div className="w-full">{hero}</div>}

          {/* Canvas with Palette Surface */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-hidden"
          >
            {children}
          </main>

          {/* Optional Uncompressed Full-Width Bottom CTA */}
          {cta && <div className="w-full">{cta}</div>}

          <Footer />
        </div>
      </div>
    </div>
  );
};
