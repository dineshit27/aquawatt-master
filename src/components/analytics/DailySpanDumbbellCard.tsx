import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { DAILY_7D_DATA } from '../../data/mockData';
import { buildDailySpanRange, type DailySpanPoint } from '../../utils/analyticsVisualizations';

export const DailySpanDumbbellCard: React.FC = () => {
  const [resource, setResource] = useState<'power' | 'water'>('power');
  const [hoveredDay, setHoveredDay] = useState<DailySpanPoint | null>(null);

  const spans = useMemo(() => buildDailySpanRange(DAILY_7D_DATA), []);

  const maxAxis = resource === 'power' ? 4.0 : 90;
  const ticks = resource === 'power' ? [0, 1, 2, 3, 4] : [0, 30, 60, 90];

  const toPct = (v: number) => Math.min(100, Math.max(0, (v / maxAxis) * 100));

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
              Baseload-to-Peak Swing
            </h3>
            <span
              title="Daily idle baseload minimum vs mean and peak demand envelope across 7 days (amber marks high-swing days)"
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            role="group"
            aria-label="Select dumbbell resource metric"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono"
          >
            {(['power', 'water'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                aria-pressed={resource === mode}
                onClick={() => setResource(mode)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  resource === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {mode === 'power' ? 'Power (kW)' : 'Water (L/h)'}
              </button>
            ))}
          </div>
        </div>

        {/* Scale Header */}
        <div className="mt-4 mb-1 grid grid-cols-[44px_1fr_84px] items-center gap-3 text-[10px] font-mono text-slate-400 tabular-nums">
          <span />
          <div className="relative h-4">
            {ticks.map(t => (
              <span
                key={t}
                className="absolute -translate-x-1/2"
                style={{ left: `${toPct(t)}%` }}
              >
                {t}
              </span>
            ))}
          </div>
          <span className="text-right">Min → Peak</span>
        </div>

        {/* Dumbbell Rows */}
        <div className="space-y-2.5">
          {spans.map(day => {
            const minVal = resource === 'power' ? day.powerMinKw : day.waterMinLph;
            const avgVal = resource === 'power' ? day.powerAvgKw : day.waterAvgLph;
            const peakVal = resource === 'power' ? day.powerPeakKw : day.waterPeakLph;

            const minLeft = toPct(minVal);
            const avgLeft = toPct(avgVal);
            const peakLeft = toPct(peakVal);

            const accentFill = day.isHighSwing
              ? 'bg-amber-500'
              : resource === 'power'
              ? 'bg-[#237A57]'
              : 'bg-[#174A8B]';

            const barFill = day.isHighSwing
              ? 'bg-amber-400/55 dark:bg-amber-400/45'
              : resource === 'power'
              ? 'bg-emerald-500/45 dark:bg-emerald-400/40'
              : 'bg-[#174A8B]/40 dark:bg-sky-400/40';

            return (
              <div
                key={day.date}
                tabIndex={0}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                onFocus={() => setHoveredDay(day)}
                onBlur={() => setHoveredDay(null)}
                aria-label={`${day.dayName} (${day.date}): Idle ${minVal}, Mean ${avgVal}, Peak ${peakVal} ${
                  resource === 'power' ? 'kW' : 'L/h'
                }`}
                className="grid grid-cols-[44px_1fr_84px] items-center gap-3 py-1 rounded-md hover:bg-slate-50/80 dark:hover:bg-slate-800/30 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] transition-colors text-xs tabular-nums"
                title={`${day.dayName} (${day.date}): Idle ${minVal} · Mean ${avgVal} · Peak ${peakVal} ${
                  resource === 'power' ? 'kW' : 'L/h'
                }`}
              >
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {day.dayName}
                </span>

                {/* Track */}
                <div className="relative h-5 flex items-center">
                  {/* Baseline Grid Rail */}
                  <div className="w-full h-px bg-slate-200 dark:bg-slate-700/80" />

                  {/* Span Connector */}
                  <div
                    className={`absolute h-1.5 rounded-full ${barFill}`}
                    style={{
                      left: `${minLeft}%`,
                      width: `${Math.max(2, peakLeft - minLeft)}%`,
                    }}
                  />

                  {/* Idle Min Dot */}
                  <span
                    className="absolute w-2.5 h-2.5 -ml-1.25 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-500 dark:border-slate-400"
                    style={{ left: `${minLeft}%` }}
                  />

                  {/* Mean Tick */}
                  <span
                    className="absolute w-0.5 h-3 -ml-px bg-slate-700 dark:bg-slate-200 rounded-full"
                    style={{ left: `${avgLeft}%` }}
                  />

                  {/* Peak Dot */}
                  <span
                    className={`absolute w-3 h-3 -ml-1.5 rounded-full ring-2 ring-white dark:ring-[#121B2B] ${accentFill}`}
                    style={{ left: `${peakLeft}%` }}
                  />
                </div>

                <span
                  className={`text-right font-mono text-[11px] font-medium ${
                    day.isHighSwing
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {minVal}–{peakVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border-2 border-slate-500 inline-block" /> Idle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-2.5 bg-slate-700 dark:bg-slate-200 inline-block" /> Mean
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High swing
          </span>
        </div>
        <span>
          {hoveredDay
            ? `${hoveredDay.dayName} swing +${(
                (resource === 'power' ? hoveredDay.powerPeakKw - hoveredDay.powerMinKw : hoveredDay.waterPeakLph - hoveredDay.waterMinLph)
              ).toFixed(resource === 'power' ? 2 : 1)} ${resource === 'power' ? 'kW' : 'L/h'}`
            : 'Sat · Wed peaks'}
        </span>
      </div>
    </div>
  );
};
