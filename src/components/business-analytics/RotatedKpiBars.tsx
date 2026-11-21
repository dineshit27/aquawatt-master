import React, { useState } from 'react';
import { RotatedBarCategory } from '../../types/businessAnalytics';

interface RotatedKpiBarsProps {
  items: ReadonlyArray<RotatedBarCategory>;
  ariaLabel: string;
}

export const RotatedKpiBars: React.FC<RotatedKpiBarsProps> = ({
  items,
  ariaLabel,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        No facility zone comparison bars available for the active filter.
      </div>
    );
  }

  const safeIdx = Math.min(activeIndex, items.length - 1);
  const activeItem = items[safeIdx];
  const maxMetric = Math.max(1, ...items.map(i => i.sharePct));

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((idx + 1) % items.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((idx - 1 + items.length) % items.length);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b"
        style={{ borderColor: 'var(--rule)' }}
      >
        <div className="min-w-0">
          <div
            className="mono-meta text-[10.5px] uppercase tracking-wider"
            style={{ color: 'var(--ink-muted)' }}
          >
            Selected Highlight · {activeItem.metricUnit}
          </div>
          <div
            className="text-base font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {activeItem.name} — {activeItem.headlineFormatted}
          </div>
        </div>
        <div
          className="mono-meta text-[11px]"
          style={{ color: 'var(--ink-muted)' }}
        >
          {activeItem.subtitle}
        </div>
      </div>

      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'var(--ink-muted)' }}
      >
        {activeItem.leadDescription}
      </p>

      <div className="kbar-scroll">
        <div
          className="kbar-grid"
          role="listbox"
          aria-label={ariaLabel}
        >
          {items.map((item, idx) => {
            // Reserve top space for full horizontal numeric value so bar height scales smoothly without ever clipping labels
            const barHeightPct = Math.max(
              18,
              Math.round((item.sharePct / maxMetric) * 78)
            );
            const isActive = idx === safeIdx;

            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`kbar-item ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(idx)}
                onKeyDown={e => handleKeyDown(e, idx)}
              >
                <div className="kbar-track">
                  <span className="kbar-top-val">
                    {item.headlineFormatted}
                  </span>
                  <div
                    className="kbar-fill"
                    style={{
                      height: `${barHeightPct}%`,
                      background: `var(${item.bandColorVar})`,
                    }}
                  />
                </div>
                <div className="kbar-meta">
                  <div className="kbar-label-name">{item.name}</div>
                  <div className="kbar-label-sub">{item.metricUnit}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
