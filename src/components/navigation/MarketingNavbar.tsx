import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { AnimatedThemeToggler } from '../ui/animated-theme-toggler';
import { BrandLogo } from '../common/BrandLogo';

interface MarketingNavbarProps {
  showOnlyWhenScrolled?: boolean;
  darkHero?: boolean;
}

export const MarketingNavbar: React.FC<MarketingNavbarProps> = ({
  showOnlyWhenScrolled = false,
  darkHero = false,
}) => {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useApp();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Business BI', path: '/business-analytics' },
    { label: 'Community', path: '/community' },
    { label: 'Pricing', path: '/subscription' },
    { label: 'Contact', path: '/contact' },
  ];

  const isHiddenAtTop = showOnlyWhenScrolled && !isScrolled;
  const overDarkHero = darkHero && !isScrolled;

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isHiddenAtTop
          ? '-translate-y-full opacity-0 pointer-events-none'
          : isScrolled
          ? 'translate-y-0 opacity-100 bg-white/85 dark:bg-[#0B111D]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs'
          : 'translate-y-0 opacity-100 bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1380px] mx-auto px-3 sm:px-5 lg:px-8 h-18 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 lg:gap-2.5 group shrink-0">
          <BrandLogo
            size="sm"
            decorative
            className="group-hover:scale-105 transition-transform"
          />
          <span
            className={`font-heading font-bold text-lg tracking-tight whitespace-nowrap ${
              overDarkHero ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            Aqua
            <span className={overDarkHero ? 'text-sky-400' : 'text-[#174A8B] dark:text-sky-400'}>
              Watt
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className={`hidden md:flex items-center gap-0.5 lg:gap-1 p-1 rounded-full border backdrop-blur-xs shrink-0 ${
            overDarkHero
              ? 'bg-slate-900/65 border-white/15'
              : 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60'
          }`}
        >
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-2.5 lg:px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? overDarkHero
                      ? 'bg-white/15 text-white shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : overDarkHero
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Theme Switcher */}
          <AnimatedThemeToggler
            theme={theme}
            onThemeChange={setTheme}
            duration={450}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
              overDarkHero
                ? 'text-slate-200 hover:text-white border-white/20 hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
          />

          {/* Primary CTA */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 lg:px-4 py-2 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white transition-all shadow-xs hover:shadow cursor-pointer whitespace-nowrap"
          >
            <span>{isAuthenticated ? 'Live Console' : 'Sign In'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-nav"
            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              overDarkHero
                ? 'text-slate-200 border-white/20 hover:bg-white/10'
                : 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="marketing-mobile-nav"
          aria-label="Mobile Navigation"
          className="md:hidden bg-white/95 dark:bg-[#0B111D]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-5 py-4 space-y-2"
        >
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-[#174A8B]/10 text-[#174A8B] dark:text-sky-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#174A8B] text-white text-sm font-semibold shadow-xs"
            >
              <span>{isAuthenticated ? 'Open IoT Dashboard' : 'Sign In to Console'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};
