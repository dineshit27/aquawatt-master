import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, Check, X, Info } from 'lucide-react';

export const AIRecommendationsPanel: React.FC = () => {
  const { recommendations, applyRecommendation, dismissRecommendation, telemetrySourceMode } = useApp();
  const isPhysical = telemetrySourceMode === 'physical';

  const activeRecs = recommendations.filter(r => r.status !== 'dismissed');
  const totalPotentialInr = activeRecs.reduce((sum, r) => sum + r.estimatedSavingsMonthly, 0);

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
            Optimization Rules
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
            {isPhysical && activeRecs.length === 0 ? '—' : `+₹${totalPotentialInr}/mo`}
          </span>
          <span
            title="Simulated behavioral, tariff arbitrage, and appliance schedules computed from ESP32 telemetry baselines"
            className="text-slate-400 hover:text-slate-600 cursor-help"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('aquawatt:open-assistant'))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />
          <span>Ask Assistant</span>
        </button>
      </div>

      {/* Wordless Optimization Grid or Empty State */}
      {activeRecs.length === 0 ? (
        <div className="mt-4 flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <Sparkles className="w-7 h-7 text-slate-400 mb-2 opacity-70" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {isPhysical
              ? 'Optimization Rules Await Physical Baseline History'
              : 'All Optimization Rules Dismissed'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            {isPhysical
              ? 'Collect sustained FS-S401 flow history and calibrated power metrics in Supabase before generating automated savings rules.'
              : 'Switch to Demo Telemetry or Ask Assistant to analyze specific appliance schedules.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4 flex-1">
          {activeRecs.map(rec => {
            const isApplied = rec.status === 'applied';
            const isWater = rec.resource === 'water';

            return (
              <div
                key={rec.id}
                title={rec.description}
                className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                  isApplied
                    ? 'bg-emerald-50/35 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/70'
                    : 'bg-white dark:bg-slate-900/20 border-slate-200/85 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase">
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          isWater
                            ? 'bg-sky-50 dark:bg-sky-950/50 text-[#174A8B] dark:text-sky-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-[#237A57] dark:text-emerald-300'
                        }`}
                      >
                        {rec.resource}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {rec.difficulty}
                      </span>
                      <span className="text-slate-400">{rec.category}</span>
                    </div>
                    <span
                      title={rec.description}
                      className="text-slate-400 hover:text-slate-600 cursor-help shrink-0"
                    >
                      <Info className="w-3 h-3" />
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-2.5 leading-snug">
                    {rec.title}
                  </h4>

                  <div className="mt-2 text-[11px] font-mono font-semibold text-[#237A57] dark:text-emerald-400 tabular-nums">
                    +₹{rec.estimatedSavingsMonthly}/mo · {rec.estimatedResourceSaved}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-end gap-1.5">
                  {!isApplied ? (
                    <>
                      <button
                        type="button"
                        onClick={() => dismissRecommendation(rec.id)}
                        aria-label={`Dismiss ${rec.title}`}
                        title="Dismiss rule"
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRecommendation(rec.id)}
                        title="Frontend Demonstration: Simulates applying this schedule rule."
                        className="px-2.5 py-1 rounded-md bg-[#174A8B] hover:bg-[#123A6F] text-white text-[11px] font-medium font-mono transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#237A57] dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
