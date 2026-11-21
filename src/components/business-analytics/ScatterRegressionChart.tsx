import React, { useMemo, useState } from 'react';
import { ScatterCategory, ScatterObservation } from '../../types/businessAnalytics';
import {
  computeOLSRegression,
  scaleLinear,
} from '../../utils/businessAnalyticsMath';
import { TooltipCallbacks } from './UnitMatrixChart';

interface ScatterRegressionChartProps extends TooltipCallbacks {
  observations: ReadonlyArray<ScatterObservation>;
}

const ALL_CATEGORIES: ScatterCategory[] = [
  'Continuous Process',
  'Cooling Loop',
  'Municipal Supply',
  'ESP32 Physical',
];

const CAT_COLORS: Record<ScatterCategory, string> = {
  'Continuous Process': 'var(--brand-band)',
  'Cooling Loop': 'var(--series-b)',
  'Municipal Supply': 'var(--series-d)',
  'ESP32 Physical': 'var(--series-c)',
};

export const ScatterRegressionChart: React.FC<ScatterRegressionChartProps> = ({
  observations,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [hiddenCats, setHiddenCats] = useState<Set<ScatterCategory>>(() => new Set());
  const [minFlowScore, setMinFlowScore] = useState(0);
  const [showTrendline, setShowTrendline] = useState(true);

  const presentCategories = useMemo(() => {
    const set = new Set<ScatterCategory>();
    for (const o of observations) set.add(o.category);
    return ALL_CATEGORIES.filter(c => set.has(c));
  }, [observations]);

  const filtered = useMemo(
    () =>
      observations.filter(
        o => !hiddenCats.has(o.category) && o.xFlowScore >= minFlowScore
      ),
    [observations, hiddenCats, minFlowScore]
  );

  const ols = useMemo(
    () =>
      computeOLSRegression(
        filtered.map(o => ({ x: o.xFlowScore, y: o.yMonthlyLitersK }))
      ),
    [filtered]
  );

  const toggleCat = (cat: ScatterCategory) => {
    setHiddenCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (observations.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        No paired observations loaded for usage relationship regression yet.
      </div>
    );
  }

  const svgW = 680;
  const svgH = 340;
  const padL = 62;
  const padR = 26;
  const padT = 22;
  const padB = 46;

  const xMin = 0;
  const xMax = 100;
  const yMax = Math.max(
    50,
    Math.ceil(Math.max(...observations.map(o => o.yMonthlyLitersK)) * 1.12)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {presentCategories.map(cat => {
            const hidden = hiddenCats.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                aria-pressed={!hidden}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs cursor-pointer"
                style={{
                  borderColor: !hidden ? 'var(--band)' : 'var(--rule)',
                  opacity: hidden ? 0.45 : 1,
                  background: 'var(--paper)',
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: CAT_COLORS[cat] }}
                />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs mono-meta cursor-pointer">
            <span>Min Utilization: {minFlowScore}%</span>
            <input
              type="range"
              min={0}
              max={85}
              step={5}
              value={minFlowScore}
              onChange={e => setMinFlowScore(Number(e.target.value))}
              className="w-28 accent-[#174A8B]"
            />
          </label>

          <button
            type="button"
            className="seg-btn border"
            style={{ borderColor: 'var(--rule)' }}
            aria-pressed={showTrendline}
            onClick={() => setShowTrendline(prev => !prev)}
          >
            {showTrendline ? 'OLS Line: On' : 'OLS Line: Off'}
          </button>
        </div>
      </div>

      {/* Live Computed Regression Readout Strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border text-xs mono-meta"
        style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
      >
        <div>
          Active Sample Size: <strong>n = {filtered.length}</strong>
        </div>
        {ols ? (
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Slope (β₁): <strong>{ols.slope >= 0 ? '+' : ''}{ols.slope.toFixed(2)} kL / pt</strong>
            </span>
            <span>
              Intercept (β₀): <strong>{ols.intercept.toFixed(1)} kL</strong>
            </span>
            <span>
              Fit R²: <strong>{ols.rSquared.toFixed(3)}</strong>
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--accent-red)' }}>
            OLS requires n ≥ 3 points with distinct utilization scores.
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Utilization index versus monthly water volume scatter plot with OLS trendline"
      >
        {/* Horizontal Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
          const val = Math.round(yMax * f);
          const y = scaleLinear(val, 0, yMax, svgH - padB, padT);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={svgW - padR}
                y2={y}
                stroke="var(--rule)"
                strokeDasharray={f === 0 ? undefined : '2 3'}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--ink-muted)"
                fontFamily="var(--font-mono)"
              >
                {val} kL
              </text>
            </g>
          );
        })}

        {/* X ticks */}
        {[0, 25, 50, 75, 100].map(xv => {
          const x = scaleLinear(xv, xMin, xMax, padL, svgW - padR);
          return (
            <g key={xv}>
              <line
                x1={x}
                y1={padT}
                x2={x}
                y2={svgH - padB}
                stroke="var(--rule)"
                strokeDasharray="2 3"
              />
              <text
                x={x}
                y={svgH - padB + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ink-muted)"
                fontFamily="var(--font-mono)"
              >
                {xv}%
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={(padL + svgW - padR) / 2}
          y={svgH - 8}
          textAnchor="middle"
          fontSize="11"
          fill="var(--ink-muted)"
        >
          Flow Stability / Utilization Index (%)
        </text>
        <text
          x={14}
          y={(padT + svgH - padB) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(padT + svgH - padB) / 2})`}
          fontSize="11"
          fill="var(--ink-muted)"
        >
          Monthly Water Volume (kL)
        </text>

        {/* Computed OLS Linear Regression Trendline */}
        {showTrendline && ols && (
          (() => {
            const x1Val = Math.max(0, minFlowScore);
            const x2Val = 100;
            const y1Val = Math.max(0, Math.min(yMax, ols.slope * x1Val + ols.intercept));
            const y2Val = Math.max(0, Math.min(yMax, ols.slope * x2Val + ols.intercept));
            return (
              <line
                x1={scaleLinear(x1Val, xMin, xMax, padL, svgW - padR)}
                y1={scaleLinear(y1Val, 0, yMax, svgH - padB, padT)}
                x2={scaleLinear(x2Val, xMin, xMax, padL, svgW - padR)}
                y2={scaleLinear(y2Val, 0, yMax, svgH - padB, padT)}
                stroke="var(--ink)"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            );
          })()
        )}

        {/* Category Multi-Shape Scatter Marks (accessible without color alone) */}
        {filtered.map(pt => {
          const cx = scaleLinear(pt.xFlowScore, xMin, xMax, padL, svgW - padR);
          const cy = scaleLinear(pt.yMonthlyLitersK, 0, yMax, svgH - padB, padT);
          const color = CAT_COLORS[pt.category];
          const title = `${pt.label} (${pt.category})`;
          const meta = `Utilization: ${pt.xFlowScore}% · Volume: ${pt.yMonthlyLitersK} kL/mo · Zone: ${pt.zone}`;

          const commonProps = {
            tabIndex: 0,
            className: 'cursor-pointer focus:outline-none',
            'aria-label': `${title}: ${meta}`,
            onMouseEnter: (e: React.MouseEvent) => onShowTooltip(e.clientX, e.clientY, title, meta),
            onMouseMove: (e: React.MouseEvent) => onShowTooltip(e.clientX, e.clientY, title, meta),
            onMouseLeave: onHideTooltip,
            onFocus: (e: React.FocusEvent<SVGElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onShowTooltip(rect.left + rect.width / 2, rect.top, title, meta);
            },
            onBlur: onHideTooltip,
          };

          if (pt.category === 'Cooling Loop') {
            return (
              <rect
                key={pt.id}
                x={cx - 5.5}
                y={cy - 5.5}
                width={11}
                height={11}
                fill={color}
                stroke="var(--paper-raised)"
                strokeWidth={1.5}
                {...commonProps}
              />
            );
          }

          if (pt.category === 'Municipal Supply') {
            return (
              <polygon
                key={pt.id}
                points={`${cx},${cy - 7} ${cx + 6.5},${cy + 5.5} ${cx - 6.5},${cy + 5.5}`}
                fill={color}
                stroke="var(--paper-raised)"
                strokeWidth={1.5}
                {...commonProps}
              />
            );
          }

          if (pt.category === 'ESP32 Physical') {
            return (
              <polygon
                key={pt.id}
                points={`${cx},${cy - 7.5} ${cx + 7.5},${cy} ${cx},${cy + 7.5} ${cx - 7.5},${cy}`}
                fill={color}
                stroke="var(--ink)"
                strokeWidth={1.5}
                {...commonProps}
              />
            );
          }

          return (
            <circle
              key={pt.id}
              cx={cx}
              cy={cy}
              r={6}
              fill={color}
              stroke="var(--paper-raised)"
              strokeWidth={1.5}
              {...commonProps}
            />
          );
        })}
      </svg>
    </div>
  );
};
