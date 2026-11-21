import React from 'react';
import {
  DivergingVarianceItem,
  WaffleCategoryItem,
} from '../../types/businessAnalytics';
import { TooltipCallbacks } from './UnitMatrixChart';

interface DistributionWaffleAndBarsProps extends TooltipCallbacks {
  waffleItems: ReadonlyArray<WaffleCategoryItem>;
  divergingVariance: ReadonlyArray<DivergingVarianceItem>;
}

const ROLE_FILL: Record<WaffleCategoryItem['colorRole'], string> = {
  verified: 'var(--series-c)',
  demo: 'var(--brand-band)',
  pending: 'var(--series-d)',
};

export const DistributionWaffleAndBars: React.FC<DistributionWaffleAndBarsProps> = ({
  waffleItems,
  divergingVariance,
  onShowTooltip,
  onHideTooltip,
}) => {
  // Expand categories into 100 waffle tiles deterministically
  const tiles: Array<{
    idx: number;
    label: string;
    color: string;
    description: string;
  }> = [];

  for (const cat of waffleItems) {
    for (let i = 0; i < cat.count && tiles.length < 100; i++) {
      tiles.push({
        idx: tiles.length,
        label: cat.label,
        color: ROLE_FILL[cat.colorRole],
        description: cat.description,
      });
    }
  }
  while (tiles.length < 100 && waffleItems.length > 0) {
    const last = waffleItems[waffleItems.length - 1];
    tiles.push({
      idx: tiles.length,
      label: last.label,
      color: ROLE_FILL[last.colorRole],
      description: last.description,
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: 10x10 Telemetry Verification & Distribution Waffle */}
      <div className="lg:col-span-5 space-y-4">
        <div className="mono-meta text-[10.5px] uppercase tracking-wider font-semibold">
          100-Unit Telemetry Verification Share
        </div>

        <svg
          viewBox="0 0 220 220"
          className="w-full max-w-[260px] h-auto block"
          role="img"
          aria-label="10 by 10 telemetry verification waffle chart"
        >
          {tiles.map(t => {
            const col = t.idx % 10;
            const row = Math.floor(t.idx / 10);
            const size = 18;
            const gap = 4;
            const x = col * (size + gap);
            const y = row * (size + gap);
            return (
              <rect
                key={t.idx}
                x={x}
                y={y}
                width={size}
                height={size}
                rx={2.5}
                fill={t.color}
                tabIndex={0}
                className="cursor-pointer transition-transform hover:scale-105 focus:outline-none"
                aria-label={`${t.label} tile ${t.idx + 1}: ${t.description}`}
                onMouseEnter={e =>
                  onShowTooltip(e.clientX, e.clientY, t.label, t.description)
                }
                onMouseMove={e =>
                  onShowTooltip(e.clientX, e.clientY, t.label, t.description)
                }
                onMouseLeave={onHideTooltip}
                onFocus={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onShowTooltip(rect.left + rect.width / 2, rect.top, t.label, t.description);
                }}
                onBlur={onHideTooltip}
              />
            );
          })}
        </svg>

        <div className="space-y-1.5 text-xs">
          {waffleItems.map(cat => (
            <div key={cat.id} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-[2px] shrink-0"
                  style={{ background: ROLE_FILL[cat.colorRole] }}
                  aria-hidden="true"
                />
                <span className="font-medium">{cat.label}</span>
              </div>
              <span className="mono-meta font-semibold">{cat.count}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Diverging Zone Variance Bars (Conservation Surplus vs Over-Baseline) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="mono-meta text-[10.5px] uppercase tracking-wider font-semibold">
            Zone Flow Variance vs Target Corridor (%)
          </div>
          <div className="flex items-center gap-3 text-[11px] mono-meta">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--series-c)' }} />
              Under Target
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--rule-strong)' }} />
              In Band
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--accent-red)' }} />
              Over Draw
            </span>
          </div>
        </div>

        {divergingVariance.length === 0 ? (
          <div
            className="p-5 text-center rounded border text-xs"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
          >
            No variance corridor intervals computed under the current physical filter.
          </div>
        ) : (
          <div className="space-y-3">
            {divergingVariance.map(row => {
              const title = row.zone;
              const meta = `Under target: ${row.aboveTargetPct}% · Nominal tolerance: ${row.onTargetPct}% · Over-draw: ${row.belowTargetPct}%`;

              return (
                <div
                  key={row.id}
                  tabIndex={0}
                  className="space-y-1 cursor-pointer focus:outline-none"
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{row.zone}</span>
                    <span className="mono-meta text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      {row.aboveTargetPct}% efficient · {row.belowTargetPct}% excess
                    </span>
                  </div>
                  <div className="flex h-6 w-full rounded-[3px] overflow-hidden border" style={{ borderColor: 'var(--rule)' }}>
                    <div
                      style={{
                        width: `${row.aboveTargetPct}%`,
                        background: 'var(--series-c)',
                      }}
                      title={`Under target ${row.aboveTargetPct}%`}
                    />
                    <div
                      style={{
                        width: `${row.onTargetPct}%`,
                        background: 'var(--rule)',
                      }}
                      title={`In target band ${row.onTargetPct}%`}
                    />
                    <div
                      style={{
                        width: `${row.belowTargetPct}%`,
                        background: 'var(--accent-red)',
                      }}
                      title={`Over target draw ${row.belowTargetPct}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
