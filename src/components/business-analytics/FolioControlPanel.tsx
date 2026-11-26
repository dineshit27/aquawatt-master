import React, { useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import {
  BusinessDataSourceMode,
  FolioPaletteId,
  ReportingPeriodId,
} from '../../types/businessAnalytics';

interface FolioControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMode: BusinessDataSourceMode;
  onSourceModeChange: (mode: BusinessDataSourceMode) => void;
  reportingPeriod: ReportingPeriodId;
  onReportingPeriodChange: (period: ReportingPeriodId) => void;
  palette: FolioPaletteId;
  onPaletteChange: (palette: FolioPaletteId) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  showGridOverlay: boolean;
  onToggleGridOverlay: () => void;
  onRefreshPhysical: () => void;
  isRefreshing: boolean;
  physicalRecordCount: number;
}

const PALETTES: ReadonlyArray<{ id: FolioPaletteId; label: string; swatch: string }> = [
  { id: 'aquawatt', label: 'AquaWatt Swiss', swatch: '#174A8B' },
  { id: 'swiss', label: 'Swiss Editorial', swatch: '#1E1C1A' },
  { id: 'ivory', label: 'Warm Ivory', swatch: '#FAF8F3' },
  { id: 'forest', label: 'Botanical Green', swatch: '#1A3A2E' },
  { id: 'terracotta', label: 'Terracotta Print', swatch: '#7A3422' },
  { id: 'dark', label: 'Night Slate', swatch: '#0B111D' },
];

export const FolioControlPanel: React.FC<FolioControlPanelProps> = ({
  isOpen,
  onClose,
  sourceMode,
  onSourceModeChange,
  reportingPeriod,
  onReportingPeriodChange,
  palette,
  onPaletteChange,
  theme,
  onThemeChange,
  showGridOverlay,
  onToggleGridOverlay,
  onRefreshPhysical,
  isRefreshing,
  physicalRecordCount,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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
      aria-labelledby="folio-ctrl-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md h-full overflow-y-auto p-6 flex flex-col gap-6 border-l"
        style={{
          background: 'var(--paper-raised)',
          color: 'var(--ink)',
          borderColor: 'var(--rule)',
        }}
      >
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div>
            <p className="mono-meta text-[10px] uppercase tracking-widest opacity-70">
              Edition Controls
            </p>
            <h2
              id="folio-ctrl-title"
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Business Analytics Settings
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings drawer"
            className="w-8 h-8 flex items-center justify-center rounded border cursor-pointer"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Data Source Mode */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="mono-meta text-[11px] uppercase tracking-wider font-semibold">
              Telemetry Source Mode
            </span>
            <button
              type="button"
              onClick={onRefreshPhysical}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Supabase ({physicalRecordCount} rows)
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                {
                  id: 'hybrid',
                  label: 'Hybrid Audit (Physical + Demo Fleet)',
                  desc: 'Overlays real FS-S401 packets onto labeled enterprise zones.',
                },
                {
                  id: 'physical',
                  label: 'Verified Physical Only (FS-S401)',
                  desc: 'Strict Supabase queries only; zero synthetic rows injected.',
                },
                {
                  id: 'demo',
                  label: 'Enterprise Demo Dataset',
                  desc: 'Deterministic 6-zone simulation for full executive preview.',
                },
              ] as const
            ).map(opt => {
              const active = sourceMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSourceModeChange(opt.id)}
                  aria-pressed={active}
                  className="text-left p-3 rounded border transition-colors cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--band)' : 'var(--rule)',
                    background: active ? 'var(--paper)' : 'transparent',
                    boxShadow: active ? '0 0 0 1px var(--band)' : 'none',
                  }}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reporting Period */}
        <section className="space-y-2">
          <span className="mono-meta text-[11px] uppercase tracking-wider font-semibold block">
            Reporting Window
          </span>
          <div className="seg-group w-full">
            {(
              [
                { id: '7d', label: '7-Day Rolling' },
                { id: '30d', label: '30-Day Cycle' },
                { id: '90d', label: '90-Day Audit' },
              ] as const
            ).map(p => (
              <button
                key={p.id}
                type="button"
                className="seg-btn flex-1"
                aria-pressed={reportingPeriod === p.id}
                onClick={() => onReportingPeriodChange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* App Theme + Folio Palette */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="mono-meta text-[11px] uppercase tracking-wider font-semibold">
              Surface Theme & Palette
            </span>
            <div className="seg-group">
              <button
                type="button"
                className="seg-btn"
                aria-pressed={theme === 'light'}
                onClick={() => onThemeChange('light')}
              >
                Light
              </button>
              <button
                type="button"
                className="seg-btn"
                aria-pressed={theme === 'dark'}
                onClick={() => onThemeChange('dark')}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map(p => {
              const active = palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPaletteChange(p.id)}
                  aria-pressed={active}
                  className="flex items-center gap-2.5 p-2 rounded border text-left cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--band)' : 'var(--rule)',
                    background: active ? 'var(--paper)' : 'transparent',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-sm border shrink-0"
                    style={{ background: p.swatch, borderColor: 'var(--rule-strong)' }}
                  />
                  <span className="text-xs font-medium truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid & Keyboard Shortcuts Reference */}
        <section
          className="p-3.5 rounded border space-y-2"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">12-Column Editorial Grid</span>
            <button
              type="button"
              onClick={onToggleGridOverlay}
              className="seg-btn border"
              style={{ borderColor: 'var(--rule)' }}
              aria-pressed={showGridOverlay}
            >
              {showGridOverlay ? 'Visible (G)' : 'Hidden (G)'}
            </button>
          </div>
          <p className="mono-meta text-[11px] opacity-75">
            Shortcuts: J / K next/prev section · 1–9 / 0 jump directly · G toggle grid · Esc close drawers.
          </p>
        </section>

        {/* Honest Hardware Status Disclosure */}
        <section
          className="p-3.5 rounded border text-xs space-y-1.5"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div className="mono-meta text-[10.5px] uppercase font-semibold tracking-wider">
            Confirmed Hardware Boundary
          </div>
          <p className="opacity-85">
            ESP32 DevKit + FS-S401 Hall turbine pulse flow sensor (GPIO34) and local 16×2 LCD display are operational. INA219 DC power monitoring remains calibration-pending (values strictly null). Line pressure PSI, water temperature, and automated shutoff valves are not installed.
          </p>
        </section>
      </div>
    </div>
  );
};
