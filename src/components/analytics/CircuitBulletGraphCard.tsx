import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { buildCircuitBulletTargets } from '../../utils/analyticsVisualizations';

export const CircuitBulletGraphCard: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'power' | 'water'>('all');

  const items = useMemo(() => {
    const all = buildCircuitBulletTargets();
    if (filter === 'all') return all;
    return all.filter(item => item.resource === filter);
  }, [filter]);

  const overBudgetCount = items.filter(i => i.isOverTarget).length;

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
              Circuit Target Bullet Graph
            </h3>
            {overBudgetCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 tabular-nums">
                {overBudgetCount} over cap
              </span>
            )}
            <span
              title="Monthly sub-circuit actuals plotted against quantitative qualitative bands and target markers (amber indicates budget overrun)"
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            role="group"
            aria-label="Filter sub-circuits by resource"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono"
          >
            {(['all', 'power', 'water'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                aria-pressed={filter === tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'power' ? 'Power' : 'Water'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3.5 space-y-3">
          {items.map(item => {
            const actualPct = Math.min(100, (item.actual / item.maxScale) * 100);
            const targetPct = Math.min(98, (item.target / item.maxScale) * 100);

            const barColor = item.isOverTarget
              ? 'bg-amber-500 dark:bg-amber-400'
              : item.resource === 'water'
              ? 'bg-[#174A8B] dark:bg-sky-400'
              : 'bg-[#237A57] dark:bg-emerald-400';

            return (
              <div key={item.id} className="text-xs tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {item.actual.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400">
                      / {item.target.toLocaleString('en-IN')} {item.unit}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.isOverTarget
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400'
                      }`}
                    >
                      {item.variancePercent > 0 ? `+${item.variancePercent}%` : `${item.variancePercent}%`}
                    </span>
                  </div>
                </div>

                {/* Stephen Few Bullet Track: 3 qualitative range bands + primary measure bar + target tick */}
                <div
                  className="relative h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800/80 overflow-visible"
                  title={`${item.name}: ${item.actual} ${item.unit} vs ${item.target} ${item.unit} target (${item.fact})`}
                >
                  {/* Qualitative bands (0-60% optimal, 60-82% nominal, 82-100% high) */}
                  <div className="absolute inset-y-0 left-0 w-[60%] bg-slate-200/70 dark:bg-slate-700/40 rounded-l" />
                  <div className="absolute inset-y-0 left-[60%] w-[22%] bg-slate-200/40 dark:bg-slate-700/20" />

                  {/* Primary Measure Bar */}
                  <div
                    className={`absolute top-1 bottom-1 left-0 rounded-xs transition-all duration-300 ${barColor}`}
                    style={{ width: `${actualPct}%` }}
                  />

                  {/* Crisp Target Marker Tick */}
                  <span
                    className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-slate-900 dark:bg-white rounded-full z-10"
                    style={{ left: `${targetPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-slate-900 dark:bg-white inline-block" /> Cap Target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 rounded-xs bg-amber-500 inline-block" /> Over Cap
          </span>
        </div>
        <span className="tabular-nums">9,840 L · 542.4 kWh</span>
      </div>
    </div>
  );
};
