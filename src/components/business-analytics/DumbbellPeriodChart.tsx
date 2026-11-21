import React, { useMemo, useState } from 'react';
import { PeriodDumbbellItem } from '../../types/businessAnalytics';
import { formatNumber } from '../../utils/businessAnalyticsMath';
import { TooltipCallbacks } from './UnitMatrixChart';

interface DumbbellPeriodChartProps extends TooltipCallbacks {
  items: ReadonlyArray<PeriodDumbbellItem>;
  currentPeriodLabel: string;
  comparisonPeriodLabel: string;
}

type DumbbellSortMode = 'current' | 'delta' | 'previous';

export const DumbbellPeriodChart: React.FC<DumbbellPeriodChartProps> = ({
  items,
  currentPeriodLabel,
  comparisonPeriodLabel,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [sortMode, setSortMode] = useState<DumbbellSortMode>('current');

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sortMode === 'current') {
      copy.sort((a, b) => b.currentLiters - a.currentLiters);
    } else if (sortMode === 'previous') {
      copy.sort((a, b) => b.previousLiters - a.previousLiters);
    } else {
      copy.sort((a, b) => a.deltaPct - b.deltaPct);
    }
    return copy;
  }, [items, sortMode]);

  if (sorted.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        Insufficient physical period samples to compare previous vs current periods. Ingest at least two FS-S401 windows or switch to Hybrid Audit.
      </div>
    );
  }

  const maxVal = Math.max(
    100,
    ...sorted.flatMap(d => [d.previousLiters, d.currentLiters])
  );

  const svgW = 700;
  const padL = 175;
  const padR = 88;
  const rowH = 44;
  const padT = 26;
  const svgH = padT + sorted.length * rowH + 22;
  const plotW = svgW - padL - padR;

  const toX = (val: number) => padL + (val / maxVal) * plotW;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="seg-group" role="group" aria-label="Sort period comparison by">
          {(
            [
              { id: 'current', label: 'Current Volume' },
              { id: 'delta', label: 'Best Reduction %' },
              { id: 'previous', label: 'Prior Baseline' },
            ] as const
          ).map(opt => (
            <button
              key={opt.id}
              type="button"
              className="seg-btn"
              aria-pressed={sortMode === opt.id}
              onClick={() => setSortMode(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[11px] mono-meta">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border-2 inline-block"
              style={{ borderColor: 'var(--ink-muted)', background: 'var(--paper-raised)' }}
            />
            <span>{comparisonPeriodLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: 'var(--band)' }}
            />
            <span>{currentPeriodLabel}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full min-w-[540px] h-auto block"
          role="img"
          aria-label="Period-over-period consumption comparison dumbbell chart"
        >
          {/* Vertical Gridlines */}
          {ticks.map((t, i) => {
            const x = toX(t);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padT - 8}
                  x2={x}
                  y2={svgH - 22}
                  stroke="var(--rule)"
                  strokeDasharray={i === 0 ? undefined : '2 3'}
                />
                <text
                  x={x}
                  y={svgH - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--ink-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {formatNumber(t)}L
                </text>
              </g>
            );
          })}

          {sorted.map((item, idx) => {
            const cy = padT + idx * rowH + rowH / 2;
            const xPrev = toX(item.previousLiters);
            const xCurr = toX(item.currentLiters);
            const isReduction = item.deltaLiters <= 0;
            const stemColor = isReduction ? 'var(--series-c)' : 'var(--accent-red)';
            const deltaText = `${item.deltaPct > 0 ? '+' : ''}${item.deltaPct.toFixed(1)}%`;

            const title = `${item.name} (${item.zone})`;
            const meta = `Prior: ${formatNumber(item.previousLiters)} L → Current: ${formatNumber(item.currentLiters)} L (${deltaText})`;

            return (
              <g
                key={item.id}
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
              >
                <text
                  x={padL - 12}
                  y={cy + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight={600}
                  fill="var(--ink)"
                >
                  {item.name.length > 23 ? `${item.name.slice(0, 22)}…` : item.name}
                </text>

                <line
                  x1={xPrev}
                  y1={cy}
                  x2={xCurr}
                  y2={cy}
                  stroke={stemColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />

                <circle
                  cx={xPrev}
                  cy={cy}
                  r={5.5}
                  fill="var(--paper-raised)"
                  stroke="var(--ink-muted)"
                  strokeWidth={2}
                />

                <circle
                  cx={xCurr}
                  cy={cy}
                  r={6.5}
                  fill="var(--band)"
                  stroke="var(--paper-raised)"
                  strokeWidth={1.5}
                />

                <text
                  x={svgW - 8}
                  y={cy + 4}
                  textAnchor="end"
                  fontSize="11.5"
                  fontWeight={600}
                  fontFamily="var(--font-mono)"
                  fill={stemColor}
                >
                  {deltaText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
