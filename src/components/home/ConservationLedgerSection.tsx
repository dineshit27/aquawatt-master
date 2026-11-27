import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HomeSectionBadge } from './HomeSectionBadge';

export const ConservationLedgerSection: React.FC = () => {
  return (
    <section
      aria-labelledby="conservation-ledger-heading"
      className="bg-[#F7F9FB] dark:bg-[#060a14] text-slate-900 dark:text-blue-50 w-full border-t border-slate-200/80 dark:border-blue-900/60 transition-colors"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-10 mb-10">
          <div className="max-w-xl">
            <HomeSectionBadge icon="💧" className="mb-3">
              Impact Ledger
            </HomeSectionBadge>
            <h2
              id="conservation-ledger-heading"
              className="font-heading font-bold text-3xl sm:text-4xl lg:text-[2.7rem] leading-tight tracking-tight text-slate-900 dark:text-white text-balance"
            >
              The Numbers{' '}
              <span className="italic font-semibold text-[#174A8B] dark:text-sky-300">
                behind resource clarity
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-blue-100/80 leading-relaxed">
              Every conservation KPI starts with transparent sensor accounting. Below are the calibrated software benchmark references used to model single-node testbench profiles.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 max-w-sm">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-sky-200/80 leading-relaxed">
              FS-S401 pulse flow accounting, off-peak tariff modeling, and reproducible INR calculations—built for honest telemetry audits.
            </p>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 rounded-full bg-[#174A8B] text-white hover:bg-[#123A6F] dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300 px-5 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <span>View full ledger report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* Stat 1: Calibrated Demo Daily Budget */}
          <article className="md:col-span-2 lg:col-span-1 rounded-3xl bg-gradient-to-br from-sky-100 via-sky-200/90 to-sky-300/85 dark:from-sky-300 dark:via-sky-300 dark:to-sky-300 text-slate-950 px-6 py-7 sm:px-8 sm:py-9 shadow-sm border border-sky-300 dark:border-sky-400/70 flex flex-col justify-between transition-colors">
            <div>
              <p className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-[#174A8B] dark:text-slate-900/75 mb-3">
                DAILY BENCH BUDGET
              </p>
              <p className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight font-mono tabular-nums text-slate-950">
                384 L
              </p>
              <p className="mt-1 text-sm sm:text-base font-medium text-slate-900/90 dark:text-slate-950/85">
                Modeled daily flow profile (Demo)
              </p>
            </div>
            <p className="mt-5 text-xs sm:text-sm text-slate-700 dark:text-slate-950/80 max-w-md leading-relaxed">
              Calibrated 24-hour testbench water profile for a single FS-S401 pulse flow node against a 450 L daily facility budget.
            </p>
          </article>

          {/* Stat 2: Modeled Daily Load */}
          <article className="rounded-3xl bg-white dark:bg-[#0b1222] px-6 py-7 sm:px-7 sm:py-8 border border-slate-200/90 dark:border-blue-900/70 shadow-xs dark:shadow-none flex flex-col justify-between transition-colors">
            <div>
              <p className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-[#174A8B] dark:text-sky-400 mb-3">
                LOAD TIMING (DEMO)
              </p>
              <div className="flex flex-wrap items-baseline gap-1.5 font-mono tabular-nums">
                <p className="text-3xl sm:text-4xl xl:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  18.6
                </p>
                <span className="text-lg sm:text-xl font-medium tracking-tight text-[#174A8B] dark:text-sky-300">
                  kWh/d
                </span>
              </div>
              <p className="mt-1 text-sm sm:text-base text-slate-700 dark:text-blue-100/85">
                Software-modeled daily load
              </p>
            </div>
            <p className="mt-5 text-xs sm:text-sm text-slate-500 dark:text-sky-200/80 max-w-xs leading-relaxed">
              Simulation baseline used for Time-of-Use tariff arbitrage modeling (physical INA219 DC calibration pending).
            </p>
          </article>

          {/* Stat 3: Conversion Factor Constant */}
          <article className="rounded-3xl bg-white dark:bg-[#0e172b] px-6 py-7 sm:px-7 sm:py-8 border border-slate-200/90 dark:border-blue-900/70 shadow-xs dark:shadow-none flex flex-col justify-between transition-colors">
            <div>
              <p className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-[#237A57] dark:text-sky-300 mb-3">
                CARBON FACTOR
              </p>
              <div className="flex flex-wrap items-baseline gap-1.5 font-mono tabular-nums">
                <p className="text-3xl sm:text-4xl xl:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  0.00032
                </p>
                <span className="text-base sm:text-lg font-medium tracking-tight text-[#237A57] dark:text-sky-300">
                  kg/L
                </span>
              </div>
              <p className="mt-1 text-sm sm:text-base text-slate-700 dark:text-blue-100/85">
                Modeled pumping CO₂ factor
              </p>
            </div>
            <p className="mt-5 text-xs sm:text-sm text-slate-500 dark:text-sky-200/80 max-w-xs leading-relaxed">
              Unit constant applied to calculate illustrative CO₂ estimates from municipal water volume reductions.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};
