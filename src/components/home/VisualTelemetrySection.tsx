import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DuneAreaChart, type DuneSeries, fmtDay } from '../ui/dune-flow';
import { LandingLeadingPill } from '../landing/leading/LandingLeadingPill';
import { useTheme } from '../../context/ThemeContext';

const DAYS = [
  '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08',
  '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16',
  '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
  '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01',
  '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09',
  '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17',
  '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25',
  '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
  '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10',
  '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
  '2026-09-19',
];

const TELEMETRY_WAVES: Array<{ label: string; color: string; values: number[] }> = [
  {
    label: 'Potable Flow',
    color: '#0071E3',
    values: [
      5, 42, 97, 42, 56, 43, 56, 29, 49, 94, 96, 81, 63, 49, 58, 77, 86, 37, 54, 46, 36, 22, 24, 11, 13, 13, 18, 11, 4, 7, 1, 14, 23, 20, 27, 8, 13, 13, 1, 8, 17, 19, 13, 12, 22, 12, 14, 29, 6, 13, 13, 30, 37, 18, 9, 9, 5, 6, 12, 4, 7, 5, 3, 16, 9, 12, 19, 16, 30, 27, 9, 12, 7, 6, 9, 5, 2, 0, 15, 1, 5,
    ],
  },
  {
    label: 'Grid Load',
    color: '#3FD8B8',
    values: [
      0, 0, 0, 18, 28, 18, 23, 24, 22, 30, 37, 49, 39, 35, 44, 26, 43, 37, 42, 47, 32, 28, 16, 12, 9, 16, 14, 0, 5, 5, 2, 7, 13, 20, 17, 6, 2, 10, 4, 9, 6, 4, 12, 11, 33, 12, 10, 16, 27, 19, 14, 18, 15, 9, 3, 16, 8, 6, 25, 16, 5, 24, 6, 35, 57, 12, 17, 54, 40, 31, 21, 43, 22, 6, 12, 17, 3, 1, 19, 0, 24,
    ],
  },
  {
    label: 'HVAC Thermal',
    color: '#BA62FC',
    values: [
      0, 25, 11, 16, 42, 6, 23, 12, 19, 1, 2, 3, 0, 1, 0, 0, 6, 9, 0, 2, 20, 1, 2, 2, 0, 0, 11, 2, 10, 5, 1, 13, 16, 10, 5, 2, 0, 21, 65, 40, 52, 34, 10, 40, 29, 44, 45, 6, 14, 0, 9, 10, 11, 5, 4, 18, 17, 5, 24, 57, 67, 26, 9, 17, 2, 3, 11, 81, 32, 6, 8, 2, 21, 8, 3, 5, 11, 1, 7, 0, 3,
    ],
  },
  {
    label: 'Solar Offset',
    color: '#6DD400',
    values: [
      0, 8, 2, 10, 18, 11, 17, 21, 6, 6, 9, 13, 11, 2, 0, 0, 6, 14, 7, 13, 9, 17, 1, 12, 34, 17, 3, 1, 5, 14, 9, 21, 29, 3, 26, 16, 6, 6, 1, 5, 7, 7, 4, 13, 5, 21, 3, 8, 9, 4, 13, 7, 5, 6, 11, 1, 3, 12, 8, 3, 0, 2, 4, 14, 10, 11, 9, 8, 22, 19, 15, 21, 15, 15, 4, 5, 6, 0, 10, 1, 0,
    ],
  },
  {
    label: 'Peak Surge',
    color: '#FF2E54',
    values: [
      0, 4, 0, 0, 3, 2, 1, 1, 10, 9, 2, 0, 0, 0, 0, 0, 8, 2, 6, 9, 4, 18, 13, 12, 4, 2, 0, 0, 2, 5, 5, 4, 1, 0, 6, 5, 2, 6, 0, 7, 8, 0, 0, 2, 1, 7, 1, 2, 0, 5, 4, 0, 1, 1, 0, 4, 0, 5, 3, 0, 2, 0, 0, 6, 5, 2, 6, 1, 11, 1, 3, 7, 3, 1, 0, 2, 0, 0, 3, 0, 0,
    ],
  },
  {
    label: 'MQTT Sync',
    color: '#45657D',
    values: [
      0, 2, 1, 0, 0, 0, 3, 1, 1, 3, 3, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 1, 1, 2, 2, 1, 1, 4, 0, 0, 0, 0, 1, 1, 0, 2, 0, 1, 0, 2, 4, 4, 2, 5, 3, 0, 3, 0, 0, 0, 1, 4, 4, 0, 0, 1, 2, 1, 0, 0, 2, 2, 0, 2, 2, 0, 1, 0, 0, 0, 4, 3, 1, 3, 0, 2, 3, 0, 0, 0, 0,
    ],
  },
];

const SERIES: DuneSeries[] = TELEMETRY_WAVES;
const TOTAL = 5739;
const LAST_TOTAL = 32;
const AMBER = '#FF7A1A';

export const VisualTelemetrySection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [chromeMode, setChromeMode] = useState<'bare' | 'full'>('bare');
  const countRef = useRef<HTMLSpanElement | null>(null);
  const lastDay = DAYS[DAYS.length - 1];

  const handlePenProgress = (t: number) => {
    if (countRef.current) {
      countRef.current.textContent = Math.round(TOTAL * t).toLocaleString('en-US');
    }
  };

  return (
    <section className="py-24 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <LandingLeadingPill
            borderVariant="primary"
            textVariant="primary"
            className="mb-2"
          >
            Telemetry Engine
          </LandingLeadingPill>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
            Dual-Resource Historical Variance
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChromeMode('bare')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              chromeMode === 'bare'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Dune Landscape
          </button>
          <button
            type="button"
            onClick={() => setChromeMode('full')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              chromeMode === 'full'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Full Axis Matrix
          </button>
        </div>
      </div>

      {chromeMode === 'bare' ? (
        <div
          className="relative w-full overflow-hidden rounded-[20px] font-sans antialiased bg-[#000000] dark:bg-white text-white dark:text-slate-900 shadow-2xl dark:shadow-xl border border-white/10 dark:border-slate-200/90 min-h-[540px] sm:h-[520px] pb-[230px] sm:pb-0 transition-colors"
        >
          <div className="relative z-10 px-5 pt-6 sm:px-10 sm:pt-10">
            <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60 dark:text-slate-500">
              <span
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{ background: '#3FD8B8' }}
              />
              Telemetry engine · live
            </p>
            <h3 className="max-w-[640px] font-sans text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-white dark:text-slate-900 sm:text-[38px]">
              AquaWatt streams a multi-layer pulse of every node.
            </h3>
            <p className="mt-3 max-w-[560px] text-[15px] leading-[1.45] text-white/55 dark:text-slate-600">
              <span ref={countRef} className="tabular-nums text-white/85 dark:text-slate-900 font-semibold">
                {TOTAL.toLocaleString('en-US')}
              </span>{' '}
              telemetry cycles in {DAYS.length} days — one wave per sensor stream. Hover the dunes
              for a day&apos;s mix.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11.5px] text-white/60 dark:text-slate-600">
              {TELEMETRY_WAVES.map((w) => (
                <span key={w.label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-[8px] w-[8px] rounded-full"
                    style={{ background: w.color }}
                  />
                  {w.label}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 -left-[6%] -right-[6%] h-[250px]">
            <DuneAreaChart
              stretch
              chrome="bare"
              height={200}
              entrance="pen"
              penColor={AMBER}
              dataEndX={0.86}
              stage={isDark ? '#ffffff' : '#000000'}
              theme={isDark ? 'light' : 'dark'}
              days={DAYS}
              series={SERIES}
              onPenProgress={handlePenProgress}
              penHoverLabel={`${fmtDay(lastDay)} · ${LAST_TOTAL} events`}
              yLabel="Daily telemetry cycles by resource stream, AquaWatt Edge Bus"
            />
          </div>
        </div>
      ) : (
        <div
          className="p-4 sm:p-8 rounded-[20px] bg-white dark:bg-[#0E1626] border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors"
          style={
            {
              '--vz-axis': isDark ? 'rgba(148,163,184,0.32)' : 'rgba(148,163,184,0.45)',
              '--vz-track': isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.18)',
              '--vz-muted': isDark ? '#94a3b8' : '#64748b',
              '--vz-ink': isDark ? '#f8fafc' : '#0f172a',
              '--vz-ring': isDark ? '#0e1626' : '#ffffff',
              '--vz-frame': isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.35)',
              '--vz-surface': isDark ? '#0e1626' : '#ffffff',
              '--vz-text2': isDark ? '#cbd5e1' : '#334155',
              '--vz-text3': isDark ? '#94a3b8' : '#475569',
            } as React.CSSProperties
          }
        >
          <DuneAreaChart
            chrome="full"
            height={360}
            days={DAYS}
            series={SERIES}
            yLabel="Daily telemetry cycles by resource stream, AquaWatt Edge Bus"
          />
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <span className="text-slate-500 dark:text-slate-400">
          Cubic B-spline stacked composition · 81-day continuous telemetry buffer · ESP32 + MQTT
        </span>
        <Link
          to="/analytics"
          className="text-[#174A8B] dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
        >
          Launch Dedicated Analytics Suite <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
};
