import React, { useMemo, useState } from 'react';
import { TimelineMilestone, TrendSeriesPoint } from '../../types/businessAnalytics';
import {
  computeTimelineTiers,
  formatNumber,
  scaleLinear,
} from '../../utils/businessAnalyticsMath';
import { TooltipCallbacks } from './UnitMatrixChart';

interface TrendTimelineExplorerProps extends TooltipCallbacks {
  trendSeries: ReadonlyArray<TrendSeriesPoint>;
  milestones: ReadonlyArray<TimelineMilestone>;
}

export const TrendTimelineExplorer: React.FC<TrendTimelineExplorerProps> = ({
  trendSeries,
  milestones,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    milestones[0]?.id ?? ''
  );

  const selectedMilestone =
    milestones.find(m => m.id === selectedMilestoneId) ?? milestones[0];

  const placedMilestones = useMemo(() => {
    if (milestones.length === 0) return [];
    const years = milestones.map(m => m.yearNum);
    const minY = Math.min(...years) - 0.15;
    const maxY = Math.max(...years) + 0.15;
    return computeTimelineTiers(milestones, minY, maxY, 680, 72, 72, 126);
  }, [milestones]);

  // Consumption SVG dimensions
  const svgW = 680;
  const svgH = 220;
  const padL = 56;
  const padR = 24;
  const padT = 22;
  const padB = 34;

  const maxY = Math.max(
    100,
    ...trendSeries.flatMap(p => [p.dailyLiters, p.baselineLiters])
  );

  const actualPath = useMemo(() => {
    if (trendSeries.length === 0) return '';
    return trendSeries
      .map((pt, i) => {
        const x = scaleLinear(i, 0, Math.max(1, trendSeries.length - 1), padL, svgW - padR);
        const y = scaleLinear(pt.dailyLiters, 0, maxY, svgH - padB, padT);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [trendSeries, maxY]);

  const baselinePath = useMemo(() => {
    if (trendSeries.length === 0) return '';
    return trendSeries
      .map((pt, i) => {
        const x = scaleLinear(i, 0, Math.max(1, trendSeries.length - 1), padL, svgW - padR);
        const y = scaleLinear(pt.baselineLiters, 0, maxY, svgH - padB, padT);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [trendSeries, maxY]);

  return (
    <div className="space-y-6">
      {/* Daily Water Consumption Trend SVG */}
      {trendSeries.length === 0 ? (
        <div
          className="p-6 text-center rounded border text-xs"
          style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
        >
          No time-series consumption packets recorded for this physical filter window yet.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mono-meta">
            <span className="font-semibold uppercase tracking-wider">
              Daily Hydraulic Volume vs Prior Baseline
            </span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 inline-block" style={{ background: 'var(--band)' }} />
                Observed Volume (L)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-4 h-0.5 border-t-2 border-dashed inline-block"
                  style={{ borderColor: 'var(--ink-muted)' }}
                />
                Baseline Target (L)
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Consumption trend line chart comparing observed liters to baseline"
          >
            {[0, 0.5, 1].map((frac, idx) => {
              const val = Math.round(maxY * frac);
              const y = scaleLinear(val, 0, maxY, svgH - padB, padT);
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
                    {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  </text>
                </g>
              );
            })}

            <path
              d={baselinePath}
              fill="none"
              stroke="var(--ink-muted)"
              strokeWidth={1.75}
              strokeDasharray="5 4"
            />
            <path
              d={actualPath}
              fill="none"
              stroke="var(--band)"
              strokeWidth={2.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {trendSeries.map((pt, i) => {
              const x = scaleLinear(i, 0, Math.max(1, trendSeries.length - 1), padL, svgW - padR);
              const y = scaleLinear(pt.dailyLiters, 0, maxY, svgH - padB, padT);
              const title = `${pt.dateLabel} (${pt.isoDate})`;
              const meta = `Observed: ${formatNumber(pt.dailyLiters)} L · Baseline: ${formatNumber(pt.baselineLiters)} L · ${pt.flowRateLpm} L/min`;

              return (
                <g key={pt.isoDate + i}>
                  {(i === 0 || i === trendSeries.length - 1 || i % 2 === 0) && (
                    <text
                      x={x}
                      y={svgH - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--ink-muted)"
                      fontFamily="var(--font-mono)"
                    >
                      {pt.dateLabel}
                    </text>
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={4.5}
                    fill={pt.provenance === 'physical' ? 'var(--series-c)' : 'var(--band)'}
                    stroke="var(--paper-raised)"
                    strokeWidth={1.5}
                    tabIndex={0}
                    className="cursor-pointer focus:outline-none"
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
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Collision-Free Interactive Milestone Axis (Desktop SVG + Mobile Vertical Tap List) */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
        <div className="mono-meta text-[10.5px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>
          Operational Deployment & Sensor Calibration Milestones (Click to Inspect)
        </div>

        {/* Desktop Non-Overlapping SVG Timeline */}
        <div className="tl-svg-wrap">
          <svg
            viewBox="0 0 680 215"
            className="w-full h-auto block"
            role="img"
            aria-label="Operational milestone timeline"
          >
            <line
              x1={32}
              y1={36}
              x2={648}
              y2={36}
              stroke="var(--rule-strong)"
              strokeWidth={1.5}
            />
            {placedMilestones.map(ms => {
              const tierOffset = ms.tier * 46;
              const markerY = 36 + tierOffset;
              const isSelected = selectedMilestone?.id === ms.id;
              return (
                <g
                  key={ms.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${ms.date}: ${ms.fullTitle}`}
                  className="cursor-pointer focus:outline-none"
                  onClick={() => setSelectedMilestoneId(ms.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMilestoneId(ms.id);
                    }
                  }}
                >
                  {ms.tier > 0 && (
                    <line
                      x1={ms.x}
                      y1={36}
                      x2={ms.x}
                      y2={markerY}
                      stroke="var(--rule)"
                      strokeWidth={1.2}
                    />
                  )}
                  <rect
                    x={ms.x - 6}
                    y={markerY - 6}
                    width={12}
                    height={12}
                    fill={
                      isSelected
                        ? 'var(--band)'
                        : ms.highlight
                        ? 'var(--accent-red)'
                        : 'var(--ink)'
                    }
                    stroke="var(--paper-raised)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={ms.x}
                    y={markerY + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="var(--ink-muted)"
                  >
                    {ms.date}
                  </text>
                  <text
                    x={ms.x}
                    y={markerY + 34}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isSelected ? 700 : 500}
                    fill={isSelected ? 'var(--band)' : 'var(--ink)'}
                  >
                    {ms.shortTitle}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Mobile Ergonomic Tap List (< 680px) */}
        <div className="tl-mobile-list">
          {milestones.map(ms => {
            const isSelected = selectedMilestone?.id === ms.id;
            return (
              <button
                key={ms.id}
                type="button"
                onClick={() => setSelectedMilestoneId(ms.id)}
                aria-pressed={isSelected}
                className="flex items-center justify-between px-3 py-2 rounded border text-left text-xs cursor-pointer"
                style={{
                  borderColor: isSelected ? 'var(--band)' : 'var(--rule)',
                  background: isSelected ? 'var(--paper)' : 'transparent',
                }}
              >
                <span className="font-semibold">{ms.shortTitle}</span>
                <span className="mono-meta text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  {ms.date}
                </span>
              </button>
            );
          })}
        </div>

        {selectedMilestone && (
          <div
            className="mt-3 p-3.5 rounded border text-xs"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-sm">{selectedMilestone.fullTitle}</span>
              <span className="mono-meta text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                {selectedMilestone.date}
              </span>
            </div>
            <p style={{ color: 'var(--ink-muted)' }}>{selectedMilestone.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
};
