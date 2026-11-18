import React from 'react';
import { AppSidebar } from '../navigation/AppSidebar';
import { AppHeader } from '../navigation/AppHeader';
import { Footer } from '../navigation/Footer';
import { ToastContainer } from '../common/ToastContainer';
import { ScrollProgress } from '../common/ScrollProgress';

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
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB] dark:bg-[#070B13] text-[#17263F] dark:text-[#E2E8F0] selection:bg-[#174A8B] selection:text-white transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#174A8B] focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <ScrollProgress />
      <ToastContainer />

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

          {/* Pale Grey Canvas with Large White Workspace */}
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
