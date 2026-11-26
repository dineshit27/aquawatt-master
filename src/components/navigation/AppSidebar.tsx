import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Users2,
  CreditCard,
  Headphones,
  Wifi,
  Database,
  Home,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandLogo } from '../common/BrandLogo';

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { isSimulatingLive, telemetrySourceMode, activeUnreadAlertsCount } = useApp();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navItems = [
    {
      to: '/dashboard',
      label: 'Console',
      icon: LayoutDashboard,
      badge: activeUnreadAlertsCount > 0 ? activeUnreadAlertsCount : undefined,
    },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/business-analytics', label: 'Business Analytics', icon: TrendingUp },
    { to: '/community', label: 'Community', icon: Users2 },
    { to: '/subscription', label: 'Plans', icon: CreditCard },
    { to: '/contact', label: 'Support', icon: Headphones },
  ];

  return (
    <aside
      aria-label="Application sidebar"
      className="hidden md:flex flex-col items-center justify-between w-[72px] shrink-0 bg-[var(--aw-surface)] dark:bg-[#0D1524] border-r border-[var(--aw-surface-border)] dark:border-slate-800/90 py-5 px-2 z-30 transition-colors h-full"
    >
      {/* Top Brand Mark + Navigation Icons */}
      <div className="flex flex-col items-center gap-6 w-full">
        <Link
          to="/"
          title="AquaWatt — Return to Homepage"
          aria-label="AquaWatt — Return to Homepage"
          className="group relative flex items-center justify-center p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-all"
        >
          <BrandLogo
            size="md"
            decorative
            className="group-hover:scale-105 transition-transform ring-1 ring-slate-200/70 dark:ring-sky-400/25"
          />
        </Link>

        {/* Vertical Icon Navigation */}
        <nav className="flex flex-col items-center gap-2 w-full" aria-label="Main menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={
                  isActive && !isDark
                    ? {
                        backgroundColor: 'var(--aw-accent-soft)',
                        color: 'var(--aw-accent)',
                        boxShadow: '0 0 0 1px var(--aw-accent-ring)',
                      }
                    : undefined
                }
                className={`group relative w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'dark:bg-sky-500/15 dark:text-sky-400 shadow-xs dark:ring-1 dark:ring-sky-400/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.badge !== undefined && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0D1524]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Home Link & Telemetry Gateway Status */}
      <div className="flex flex-col items-center gap-3 w-full">
        <Link
          to="/"
          title="Back to Home"
          aria-label="Back to Home"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>

        <div
          title={
            telemetrySourceMode === 'physical'
              ? 'Supabase IoT Gateway: Physical Hardware Mode (FS-S401 & INA219 Nodes)'
              : isSimulatingLive
              ? 'ESP32 Gateway Node ESP32-GW-01: Connected via Wi-Fi & MQTT (Demo Telemetry Stream)'
              : 'ESP32 Gateway Node ESP32-GW-01: Telemetry Stream Paused'
          }
          className="flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 cursor-default w-12"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              telemetrySourceMode === 'physical'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
                : isSimulatingLive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            {telemetrySourceMode === 'physical' ? <Database className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              telemetrySourceMode === 'physical'
                ? 'bg-blue-500 animate-pulse'
                : isSimulatingLive
                ? 'bg-[#237A57] animate-pulse'
                : 'bg-slate-400'
            }`}
          />
        </div>
      </div>
    </aside>
  );
};
