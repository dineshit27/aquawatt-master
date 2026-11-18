import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { DAILY_7D_DATA, HOURLY_24H_DATA } from '../../data/mockData';
import { buildDiurnalHeatmap, type HeatmapSlotCell } from '../../utils/analyticsVisualizations';

export const DiurnalLoadHeatmapCard: React.FC = () => {
  const [resource, setResource] = useState<'water' | 'power'>('water');
  const [hoveredCell, setHoveredCell] = useState<HeatmapSlotCell | null>(null);

  const heatmap = useMemo(
    () => buildDiurnalHeatmap(DAILY_7D_DATA, HOURLY_24H_DATA),
    []
  );

  const getCellStyle = (cell: HeatmapSlotCell) => {
    const intensity = resource === 'water' ? cell.waterIntensity : cell.powerIntensity;
    const isAnomaly = resource === 'water' ? cell.isWaterAnomaly : cell.isPowerAnomaly;

    if (isAnomaly) {
      return {
        backgroundColor: 'rgba(217, 119, 6, 0.22)',
        borderColor: '#D97706',
      };
    }

    const alpha = Math.max(0.06, Math.min(0.88, 0.08 + intensity * 0.8));
    if (resource === 'water') {
      return {
        backgroundColor: `rgba(23, 74, 139, ${alpha.toFixed(2)})`,
        borderColor: 'transparent',
      };
    }
    return {
      backgroundColor: `rgba(35, 122, 87, ${alpha.toFixed(2)})`,
      borderColor: 'transparent',
    };
  };

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
            7-Day Diurnal Load Heatmap
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
            {resource === 'water'
              ? `${heatmap.totalWaterLiters.toLocaleString('en-IN')} L · 7d`
              : `${heatmap.totalPowerKwh.toFixed(1)} kWh · 7d`}
          </span>
          {heatmap.anomalyCount > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 tabular-nums">
              {heatmap.anomalyCount} flags
            </span>
          )}
          <span
            title="2-hour load matrix reconciled to 7-day telemetry totals; amber borders highlight nocturnal drip (02:00–04:00) and compressor surges"
            className="text-slate-400 hover:text-slate-600 cursor-help"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Interactive Hover Readout Pill (compact tabular facts only) */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 px-2.5 py-1 rounded-lg tabular-nums">
            {hoveredCell ? (
              <>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {hoveredCell.dayLabel} {hoveredCell.hourLabel}
                </span>
                <span>·</span>
                <span>
                  {resource === 'water'
                    ? `${hoveredCell.waterLiters} L (base ${hoveredCell.baselineWater} L)`
                    : `${hoveredCell.electricityKwh.toFixed(2)} kWh (base ${hoveredCell.baselineElectricity.toFixed(2)})`}
                </span>
                {((resource === 'water' && hoveredCell.isWaterAnomaly) ||
                  (resource === 'power' && hoveredCell.isPowerAnomaly)) && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    · Anomaly
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400">Hover cell for slot delta</span>
            )}
          </div>

          <div
            role="group"
            aria-label="Select heatmap resource"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono"
          >
            {(['water', 'power'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                aria-pressed={resource === mode}
                onClick={() => setResource(mode)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  resource === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'water' ? 'Water (L)' : 'Power (kWh)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Grid (scroll-safe inside card on narrow mobile viewports) */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-[600px]">
          {/* Hour Header Row */}
          <div className="grid grid-cols-[54px_repeat(12,minmax(0,1fr))_68px] gap-1.5 items-center mb-1.5 text-[10px] font-mono text-slate-400 tabular-nums">
            <span />
            {heatmap.hours.map(hour => (
              <span key={hour} className="text-center">
                {hour.slice(0, 2)}h
              </span>
            ))}
            <span className="text-right pr-1">Total</span>
          </div>

          {/* 7 Daily Rows */}
          <div className="space-y-1.5">
            {heatmap.grid.map((row, rIdx) => {
              const dayName = heatmap.days[rIdx];
              const rowSum =
                resource === 'water'
                  ? row.reduce((s, c) => s + c.waterLiters, 0)
                  : Number(row.reduce((s, c) => s + c.electricityKwh, 0).toFixed(1));

              return (
                <div
                  key={dayName}
                  className="grid grid-cols-[54px_repeat(12,minmax(0,1fr))_68px] gap-1.5 items-center"
                >
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                    {dayName}
                  </span>

                  {row.map(cell => {
                    const isAnomaly =
                      resource === 'water' ? cell.isWaterAnomaly : cell.isPowerAnomaly;
                    const valueText =
                      resource === 'water'
                        ? `${cell.waterLiters}`
                        : cell.electricityKwh.toFixed(1);
                    const cellTitle =
                      resource === 'water'
                        ? `${cell.dayLabel} ${cell.hourLabel}: ${cell.waterLiters} L (baseline ${cell.baselineWater} L)${
                            isAnomaly ? ' · Nocturnal leak alert' : ''
                          }`
                        : `${cell.dayLabel} ${cell.hourLabel}: ${cell.electricityKwh.toFixed(2)} kWh (baseline ${cell.baselineElectricity.toFixed(2)} kWh)${
                            isAnomaly ? ' · Peak surge' : ''
                          }`;

                    return (
                      <button
                        key={`${cell.dayLabel}-${cell.hourLabel}`}
                        type="button"
                        onMouseEnter={() => setHoveredCell(cell)}
                        onFocus={() => setHoveredCell(cell)}
                        onBlur={() => setHoveredCell(null)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={cellTitle}
                        aria-label={cellTitle}
                        style={getCellStyle(cell)}
                        className={`relative h-8 rounded-md border text-[10px] font-mono tabular-nums flex items-center justify-center transition-transform hover:scale-[1.04] focus:outline-hidden focus:ring-2 focus:ring-[#174A8B] cursor-pointer ${
                          isAnomaly
                            ? 'text-amber-800 dark:text-amber-200 font-semibold'
                            : (resource === 'water' ? cell.waterIntensity : cell.powerIntensity) >
                              0.52
                            ? 'text-white font-medium'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {valueText}
                        {isAnomaly && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}

                  <span className="text-right pr-1 text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {resource === 'water' ? `${rowSum} L` : `${rowSum.toFixed(1)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compact Intensity + Anomaly Legend */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div className="flex items-center gap-1">
            {[0.12, 0.3, 0.52, 0.72, 0.88].map(alpha => (
              <span
                key={alpha}
                className="w-4 h-2.5 rounded-xs"
                style={{
                  backgroundColor:
                    resource === 'water'
                      ? `rgba(23, 74, 139, ${alpha})`
                      : `rgba(35, 122, 87, ${alpha})`,
                }}
              />
            ))}
          </div>
          <span>High</span>
        </div>

        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <span className="w-2.5 h-2.5 rounded-xs border border-amber-600 bg-amber-500/20 inline-block" />
          Anomaly threshold breach
        </span>
      </div>
    </div>
  );
};
