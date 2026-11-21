import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, RefreshCw, ArrowUpRight, Grid3x3 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { PALETTE_OPTIONS } from '../../utils/workspaceTheme';

interface WorkspaceControlsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ROUTES = [
  { path: '/dashboard', label: 'Console Dashboard' },
  { path: '/analytics', label: 'Consumption Analytics' },
  { path: '/business-analytics', label: 'Business BI Edition' },
  { path: '/community', label: 'Community' },
  { path: '/subscription', label: 'Pricing & Plans' },
  { path: '/contact', label: 'Contact & Support' },
] as const;

export const WorkspaceControlsDrawer: React.FC<WorkspaceControlsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    theme,
    setTheme,
    palette,
    setPalette,
    reportingPeriod,
    setReportingPeriod,
    showGridOverlay,
    toggleGridOverlay,
  } = useTheme();
  const {
    telemetrySourceMode,
    setTelemetrySourceMode,
    refreshPhysicalTelemetry,
    physicalLoading,
    hasPhysicalData,
    isSupabaseReady,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[350] flex justify-end bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws-ctrl-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md h-full overflow-y-auto p-6 flex flex-col gap-6 bg-[var(--aw-surface)] dark:bg-[#0D1524] text-[#17263F] dark:text-[#E2E8F0] border-l border-[var(--aw-surface-border)] dark:border-slate-800 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--aw-surface-border)] dark:border-slate-800">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Workspace Controls
            </p>
            <h2
              id="ws-ctrl-title"
              className="text-lg font-bold tracking-tight font-heading text-slate-900 dark:text-white"
            >
              Telemetry &amp; Display Settings
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close workspace controls"
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--aw-surface-border)] dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetry Source Mode */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
              Telemetry Source Mode
            </span>
            {telemetrySourceMode === 'physical' && (
              <button
                type="button"
                onClick={refreshPhysicalTelemetry}
                disabled={physicalLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#174A8B] dark:text-sky-400 underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${physicalLoading ? 'animate-spin' : ''}`} />
                Sync Supabase ({hasPhysicalData ? 'Active' : isSupabaseReady ? 'Connected' : 'Unconfigured'})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(
              [
                {
                  id: 'demo',
                  label: 'Demo Telemetry Stream',
                  desc: 'Simulated ESP32 & multi-zone feeds for UI evaluation.',
                },
                {
                  id: 'physical',
                  label: 'Verified Physical Hardware (Supabase)',
                  desc: 'Live ESP32 + FS-S401 Postgres rows; INA219 remains null until calibrated.',
                },
              ] as const
            ).map(opt => {
              const active = telemetrySourceMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTelemetrySourceMode(opt.id)}
                  aria-pressed={active}
                  style={
                    active && !isDark
                      ? {
                          borderColor: 'var(--aw-accent)',
                          backgroundColor: 'var(--aw-accent-soft)',
                          boxShadow: '0 0 0 1px var(--aw-accent-ring)',
                        }
                      : undefined
                  }
                  className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'dark:border-sky-500 dark:bg-sky-950/30 dark:ring-1 dark:ring-sky-500/30'
                      : 'border-[var(--aw-surface-border)] dark:border-slate-800 hover:bg-black/[0.03] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reporting Window */}
        <section className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300 block">
            Default Reporting Window
          </span>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg border border-[var(--aw-surface-border)] dark:border-slate-800 bg-black/[0.03] dark:bg-slate-900/60">
            {(
              [
                { id: '7d', label: '7-Day' },
                { id: '30d', label: '30-Day' },
                { id: '90d', label: '90-Day' },
              ] as const
            ).map(p => {
              const active = reportingPeriod === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setReportingPeriod(p.id)}
                  style={
                    active && !isDark
                      ? { backgroundColor: 'var(--aw-accent)', color: '#FFFFFF' }
                      : undefined
                  }
                  className={`py-1.5 px-2 rounded text-xs font-medium cursor-pointer transition-colors ${
                    active
                      ? 'dark:bg-[#174A8B] dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Surface Theme & Palette */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
              Surface Theme &amp; Palette
            </span>
            <div className="inline-flex p-0.5 rounded-md border border-[var(--aw-surface-border)] dark:border-slate-800 bg-black/[0.03] dark:bg-slate-900/60">
              {(['light', 'dark'] as const).map(mode => {
                const active = theme === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(mode)}
                    style={
                      active && !isDark
                        ? { backgroundColor: 'var(--aw-accent)', color: '#FFFFFF' }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                      active
                        ? 'dark:bg-[#174A8B] dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PALETTE_OPTIONS.map(p => {
              const active = palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPalette(p.id)}
                  style={
                    active && !isDark
                      ? {
                          borderColor: 'var(--aw-accent)',
                          backgroundColor: 'var(--aw-accent-soft)',
                        }
                      : undefined
                  }
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    active
                      ? 'dark:border-sky-500 dark:bg-sky-950/30 font-semibold'
                      : 'border-[var(--aw-surface-border)] dark:border-slate-800 hover:bg-black/[0.03] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-sm border border-slate-400/50 shrink-0"
                    style={{ background: p.swatch }}
                  />
                  <span className="text-xs font-medium truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 12-Col Grid Overlay & Shortcuts */}
        <section className="p-3.5 rounded-lg border border-[var(--aw-surface-border)] dark:border-slate-800 bg-black/[0.025] dark:bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Grid3x3
                className="w-3.5 h-3.5 dark:text-sky-400"
                style={isDark ? undefined : { color: 'var(--aw-accent)' }}
              />
              12-Column Editorial Grid
            </span>
            <button
              type="button"
              onClick={toggleGridOverlay}
              aria-pressed={showGridOverlay}
              style={
                showGridOverlay && !isDark
                  ? {
                      backgroundColor: 'var(--aw-accent)',
                      borderColor: 'var(--aw-accent)',
                      color: '#FFFFFF',
                    }
                  : undefined
              }
              className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                showGridOverlay
                  ? 'dark:bg-[#174A8B] dark:text-white dark:border-[#174A8B]'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {showGridOverlay ? 'Visible (G)' : 'Hidden (G)'}
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Shortcuts: G toggle grid · ⌘J / Ctrl+J facility assistant · Esc close drawers.
          </p>
        </section>

        {/* Quick Workspace Module Switcher */}
        <section className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300 block">
            Quick Module Switcher
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ROUTES.map(route => {
              const isCurrent = location.pathname === route.path;
              return (
                <button
                  key={route.path}
                  type="button"
                  onClick={() => {
                    navigate(route.path);
                    onClose();
                  }}
                  style={
                    isCurrent && !isDark
                      ? {
                          borderColor: 'var(--aw-accent)',
                          backgroundColor: 'var(--aw-accent-soft)',
                          color: 'var(--aw-accent)',
                        }
                      : undefined
                  }
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isCurrent
                      ? 'dark:border-sky-500 dark:bg-sky-950/35 font-semibold dark:text-sky-400'
                      : 'border-[var(--aw-surface-border)] dark:border-slate-800 hover:bg-black/[0.03] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{route.label}</span>
                  <ArrowUpRight className="w-3 h-3 shrink-0 opacity-65" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Honest Hardware Disclosure */}
        <section className="p-3.5 rounded-lg border border-[var(--aw-surface-border)] dark:border-slate-800 text-xs space-y-1">
          <div className="font-mono text-[10.5px] uppercase font-semibold tracking-wider text-slate-700 dark:text-slate-300">
            Confirmed Hardware Boundary
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            ESP32 DevKit + FS-S401 Hall turbine flow sensor (GPIO34) and 16×2 character LCD are operational. INA219 DC power telemetry remains calibration-pending (values strictly null). Pressure PSI, water temperature, and shutoff valve actuators are unlinked.
          </p>
        </section>
      </div>
    </div>
  );
};
