import React, { useMemo, useRef, useState } from 'react';
import { HeatmapMatrixRow } from '../../types/businessAnalytics';
import { TooltipCallbacks } from './UnitMatrixChart';

interface PatternHeatmapProps extends TooltipCallbacks {
  columns: ReadonlyArray<string>;
  rows: ReadonlyArray<HeatmapMatrixRow>;
}

function getHeatColorTokens(val: number): { bg: string; fg: string } {
  if (val >= 80) return { bg: 'var(--heat-5)', fg: 'var(--heat-ink-dark)' };
  if (val >= 65) return { bg: 'var(--heat-4)', fg: 'var(--heat-ink-dark)' };
  if (val >= 45) return { bg: 'var(--heat-3)', fg: 'var(--heat-ink-light)' };
  if (val >= 25) return { bg: 'var(--heat-2)', fg: 'var(--heat-ink-light)' };
  if (val >= 10) return { bg: 'var(--heat-1)', fg: 'var(--heat-ink-light)' };
  return { bg: 'var(--heat-0)', fg: 'var(--heat-ink-light)' };
}

export const PatternHeatmap: React.FC<PatternHeatmapProps> = ({
  columns,
  rows,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortCol !== null) {
      copy.sort((a, b) => {
        const va = a.values[sortCol] ?? 0;
        const vb = b.values[sortCol] ?? 0;
        return sortAsc ? va - vb : vb - va;
      });
    }
    return copy;
  }, [rows, sortCol, sortAsc]);

  const activeCellsCount = useMemo(() => {
    let count = 0;
    for (const r of sortedRows) {
      for (const v of r.values) {
        if (v >= threshold) count++;
      }
    }
    return count;
  }, [sortedRows, threshold]);

  const totalCells = sortedRows.length * columns.length;

  const handleSortClick = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortAsc(prev => !prev);
    } else {
      setSortCol(colIdx);
      setSortAsc(false);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
    let nextR = rIdx;
    let nextC = cIdx;
    if (e.key === 'ArrowRight') nextC = Math.min(columns.length - 1, cIdx + 1);
    else if (e.key === 'ArrowLeft') nextC = Math.max(0, cIdx - 1);
    else if (e.key === 'ArrowDown') nextR = Math.min(sortedRows.length - 1, rIdx + 1);
    else if (e.key === 'ArrowUp') nextR = Math.max(0, rIdx - 1);
    else return;

    e.preventDefault();
    const target = gridRef.current?.querySelector<HTMLButtonElement>(
      `button[data-rc="${nextR}-${nextC}"]`
    );
    target?.focus();
  };

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        No diurnal or facility zone matrix cells recorded for this physical view yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="hm-threshold"
            className="mono-meta text-[11px] uppercase tracking-wider font-semibold"
          >
            Highlight ≥ {threshold}% Draw Intensity
          </label>
          <input
            id="hm-threshold"
            type="range"
            min={0}
            max={90}
            step={5}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-40 accent-[#174A8B] cursor-pointer"
          />
          {threshold > 0 && (
            <button
              type="button"
              onClick={() => setThreshold(0)}
              className="text-[11px] font-mono underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="mono-meta text-[11px]" style={{ color: 'var(--ink-muted)' }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{activeCellsCount}</strong> / {totalCells} intervals ≥ {threshold}%
        </div>
      </div>

      <div className="heat-scroll" aria-label="Scrollable consumption intensity matrix">
        <table ref={gridRef} className="heat-grid">
          <thead>
            <tr>
              <th className="heat-corner">Zone / Facility</th>
              {columns.map((col, cIdx) => {
                const isSorted = sortCol === cIdx;
                const arrow = isSorted ? (sortAsc ? '↑' : '↓') : '↕';
                return (
                  <th key={col} scope="col">
                    <button
                      type="button"
                      className="heat-sort-btn"
                      onClick={() => handleSortClick(cIdx)}
                      aria-label={`Sort rows by ${col}`}
                    >
                      <span>{col}</span>
                      <span aria-hidden="true">{arrow}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rIdx) => (
              <tr key={row.id}>
                <td className="heat-row-hdr" title={`${row.sector} (${row.zoneGroup})`}>
                  <div className="font-semibold text-xs truncate">{row.sector}</div>
                  <div className="mono-meta text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                    {row.zoneGroup}
                  </div>
                </td>
                {columns.map((col, cIdx) => {
                  const val = row.values[cIdx] ?? 0;
                  const { bg, fg } = getHeatColorTokens(val);
                  const belowThreshold = val < threshold;
                  const crosshairDim =
                    hoverCell !== null &&
                    hoverCell.row !== rIdx &&
                    hoverCell.col !== cIdx;
                  const isDim = belowThreshold || crosshairDim;
                  const title = `${row.sector} · ${col}`;
                  const meta = `Load Intensity Index: ${val}% (${row.provenance === 'physical' ? 'FS-S401 Verified' : 'Demo Profile'})`;

                  return (
                    <td key={col}>
                      <button
                        type="button"
                        data-rc={`${rIdx}-${cIdx}`}
                        className={`heat-cell ${isDim ? 'is-dim' : ''}`}
                        style={{ background: bg, color: fg }}
                        aria-label={`${title}: ${val}% intensity`}
                        onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                        onMouseEnter={e => {
                          setHoverCell({ row: rIdx, col: cIdx });
                          onShowTooltip(e.clientX, e.clientY, title, meta);
                        }}
                        onMouseMove={e => onShowTooltip(e.clientX, e.clientY, title, meta)}
                        onMouseLeave={() => {
                          setHoverCell(null);
                          onHideTooltip();
                        }}
                        onFocus={e => {
                          setHoverCell({ row: rIdx, col: cIdx });
                          const rect = e.currentTarget.getBoundingClientRect();
                          onShowTooltip(rect.left + rect.width / 2, rect.top, title, meta);
                        }}
                        onBlur={() => {
                          setHoverCell(null);
                          onHideTooltip();
                        }}
                      >
                        {val}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Accessible Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] mono-meta pt-1">
        <span className="uppercase tracking-wider font-semibold" style={{ color: 'var(--ink-muted)' }}>
          SCALE:
        </span>
        {[
          { label: '0–9%', color: 'var(--heat-0)' },
          { label: '10–24%', color: 'var(--heat-1)' },
          { label: '25–44%', color: 'var(--heat-2)' },
          { label: '45–64%', color: 'var(--heat-3)' },
          { label: '65–79%', color: 'var(--heat-4)' },
          { label: '80%+', color: 'var(--heat-5)' },
        ].map(step => (
          <span key={step.label} className="inline-flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-[2px] border inline-block"
              style={{ background: step.color, borderColor: 'var(--rule)' }}
              aria-hidden="true"
            />
            <span>{step.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
