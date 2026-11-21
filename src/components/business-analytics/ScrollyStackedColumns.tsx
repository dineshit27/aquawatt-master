import React, { useState } from 'react';
import {
  ScrollyNarrativeStep,
  StackedConsumptionPeriod,
} from '../../types/businessAnalytics';
import { formatCompactLiters } from '../../utils/businessAnalyticsMath';
import { TooltipCallbacks } from './UnitMatrixChart';

interface ScrollyStackedColumnsProps extends TooltipCallbacks {
  periods: ReadonlyArray<StackedConsumptionPeriod>;
  steps: ReadonlyArray<ScrollyNarrativeStep>;
}

type StackMode = 'abs' | 'share';

const SERIES_DEFS = [
  { key: 'coreFlowLiters', chip: 'core', label: 'Core Process Flow', color: 'var(--brand-band)' },
  { key: 'peakShavingLiters', chip: 'peak', label: 'Peak Window Draw', color: 'var(--series-b)' },
  { key: 'auxiliaryLiters', chip: 'aux', label: 'Auxiliary Make-Up', color: 'var(--series-d)' },
  { key: 'reserveBenchmarkLiters', chip: 'reserve', label: 'Audited Reserve', color: 'var(--series-c)' },
] as const;

export const ScrollyStackedColumns: React.FC<ScrollyStackedColumnsProps> = ({
  periods,
  steps,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [stackMode, setStackMode] = useState<StackMode>('abs');
  const [disabledSeries, setDisabledSeries] = useState<Set<string>>(() => new Set());

  const activeStep = steps[activeStepIdx];

  const toggleSeries = (key: string) => {
    setDisabledSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < SERIES_DEFS.length - 1) {
        next.add(key);
      }
      return next;
    });
  };

  if (periods.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        No multi-period stacked consumption history loaded yet under the current filter.
      </div>
    );
  }

  const maxAbs = Math.max(
    1,
    ...periods.map(p =>
      SERIES_DEFS.reduce(
        (sum, s) => sum + (disabledSeries.has(s.key) ? 0 : p[s.key]),
        0
      )
    )
  );

  const svgW = 620;
  const svgH = 310;
  const padL = 56;
  const padR = 16;
  const padT = 24;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const colSlot = plotW / periods.length;
  const barW = Math.min(44, colSlot * 0.66);

  return (
    <div className="scrolly-grid">
      {/* Left Narrative Stage Steps */}
      <div className="scrolly-steps">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIdx;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepIdx(idx)}
              aria-pressed={isActive}
              className={`scrolly-step ${isActive ? 'is-active' : ''}`}
            >
              <div className="mono-meta text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                {step.stepNumber} · {step.kicker}
              </div>
              <h3 className="text-base font-bold mt-1 mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                {step.body}
              </p>
            </button>
          );
        })}
      </div>

      {/* Right Sticky Stacked Columns Stage */}
      <div className="scrolly-sticky figure-block space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="seg-group" role="group" aria-label="Column scaling mode">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={stackMode === 'abs'}
              onClick={() => setStackMode('abs')}
            >
              Volume (Liters)
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={stackMode === 'share'}
              onClick={() => setStackMode('share')}
            >
              Share (100%)
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SERIES_DEFS.map(s => {
              const hidden = disabledSeries.has(s.key);
              const emphasized =
                activeStep?.highlightSeries === 'all' ||
                activeStep?.highlightSeries === s.chip;

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSeries(s.key)}
                  aria-pressed={!hidden}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] cursor-pointer transition-opacity"
                  style={{
                    borderColor: emphasized && !hidden ? 'var(--band)' : 'var(--rule)',
                    opacity: hidden ? 0.45 : 1,
                    background: 'var(--paper)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] inline-block"
                    style={{ background: s.color }}
                  />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Multi-period stacked consumption breakdown chart"
        >
          <defs>
            <pattern
              id="aw-forecast-hatch"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
            </pattern>
          </defs>

          {[0, 0.5, 1].map((frac, idx) => {
            const y = padT + plotH * (1 - frac);
            const label =
              stackMode === 'share'
                ? `${Math.round(frac * 100)}%`
                : formatCompactLiters(maxAbs * frac);
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={y}
                  x2={svgW - padR}
                  y2={y}
                  stroke="var(--rule)"
                  strokeDasharray={frac === 0 ? undefined : '2 3'}
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--ink-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {periods.map((period, pIdx) => {
            const cx = padL + pIdx * colSlot + colSlot / 2;
            const x = cx - barW / 2;
            const isFocusedPeriod = activeStep?.activePeriodIndex === pIdx;

            const periodTotalVisible = SERIES_DEFS.reduce(
              (sum, s) => sum + (disabledSeries.has(s.key) ? 0 : period[s.key]),
              0
            );

            let runningY = padT + plotH;

            return (
              <g key={period.id}>
                {isFocusedPeriod && (
                  <rect
                    x={x - 5}
                    y={padT - 6}
                    width={barW + 10}
                    height={plotH + 10}
                    fill="var(--band)"
                    fillOpacity={0.07}
                    stroke="var(--band)"
                    strokeDasharray="3 3"
                    rx={3}
                  />
                )}

                {SERIES_DEFS.map(s => {
                  if (disabledSeries.has(s.key)) return null;
                  const val = period[s.key];
                  const segFrac =
                    stackMode === 'share'
                      ? periodTotalVisible > 0
                        ? val / periodTotalVisible
                        : 0
                      : val / maxAbs;
                  const segH = Math.max(0, segFrac * plotH);
                  const segY = runningY - segH;
                  runningY = segY;

                  const pct = periodTotalVisible > 0 ? ((val / periodTotalVisible) * 100).toFixed(1) : '0.0';
                  const title = `${period.periodLabel} · ${s.label}`;
                  const meta = `${formatCompactLiters(val)} (${pct}% of active stack)${period.isForecast ? ' · Forecast' : ''}`;

                  return (
                    <g key={s.key}>
                      <rect
                        x={x}
                        y={segY}
                        width={barW}
                        height={segH}
                        fill={s.color}
                        fillOpacity={
                          activeStep?.highlightSeries === 'all' ||
                          activeStep?.highlightSeries === s.chip
                            ? 0.94
                            : 0.42
                        }
                        tabIndex={0}
                        className="cursor-pointer transition-opacity focus:outline-none"
                        aria-label={`${title}: ${meta}`}
                        onMouseEnter={e => onShowTooltip(e.clientX, e.clientY, title, meta)}
                        onMouseMove={e => onShowTooltip(e.clientX, e.clientY, title, meta)}
                        onMouseLeave={onHideTooltip}
                        onFocus={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onShowTooltip(rect.left + rect.width / 2, rect.top, title, meta);
                        }}
                        onBlur={onHideTooltip}
                      />
                      {period.isForecast && (
                        <rect
                          x={x}
                          y={segY}
                          width={barW}
                          height={segH}
                          fill="url(#aw-forecast-hatch)"
                          pointerEvents="none"
                        />
                      )}
                    </g>
                  );
                })}

                <text
                  x={cx}
                  y={svgH - 10}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isFocusedPeriod ? 700 : 500}
                  fontFamily="var(--font-mono)"
                  fill={isFocusedPeriod ? 'var(--band)' : 'var(--ink-muted)'}
                >
                  {period.periodLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
