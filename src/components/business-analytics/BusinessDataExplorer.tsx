import React, { useMemo, useState } from 'react';
import { Download, Search, AlertTriangle } from 'lucide-react';
import { BusinessExplorerRow } from '../../types/businessAnalytics';
import {
  buildBusinessExplorerCsvPayload,
  ExplorerDateFilter,
  ExplorerSortKey,
  filterExplorerRows,
  formatNumber,
  paginateRows,
  SortDirection,
  sortExplorerRows,
} from '../../utils/businessAnalyticsMath';
import { downloadCsv } from '../../utils/exportUtils';

interface BusinessDataExplorerProps {
  rows: ReadonlyArray<BusinessExplorerRow>;
  isLoading: boolean;
  errorMessage: string | null;
  onRetrySync: () => void;
  onExportComplete?: (count: number) => void;
}

export const BusinessDataExplorer: React.FC<BusinessDataExplorerProps> = ({
  rows,
  isLoading,
  errorMessage,
  onRetrySync,
  onExportComplete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<ExplorerDateFilter>('all');
  const [sortKey, setSortKey] = useState<ExplorerSortKey>('dailyLiters');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const zones = useMemo(() => {
    const uniq = Array.from(new Set(rows.map(r => r.zone)));
    return ['ALL', ...uniq];
  }, [rows]);

  const filtered = useMemo(
    () =>
      filterExplorerRows(rows, {
        searchQuery,
        zoneFilter,
        dateFilter,
      }),
    [rows, searchQuery, zoneFilter, dateFilter]
  );

  const sorted = useMemo(
    () => sortExplorerRows(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection]
  );

  const paged = useMemo(() => paginateRows(sorted, page, 6), [sorted, page]);

  const maxDaily = Math.max(1, ...rows.map(r => r.dailyLiters));

  const toggleSort = (key: ExplorerSortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'facilityName' || key === 'isoDate' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const handleDownloadCsv = () => {
    const payload = buildBusinessExplorerCsvPayload(sorted);
    downloadCsv('aquawatt-business-analytics.csv', payload.headers, payload.records);
    onExportComplete?.(sorted.length);
  };

  if (errorMessage) {
    return (
      <div
        className="p-6 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ borderColor: 'var(--accent-red)', background: 'var(--paper)' }}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
          <div>
            <div className="text-sm font-semibold">Telemetry Query Failed</div>
            <p className="text-xs opacity-80 mt-0.5">{errorMessage}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetrySync}
          className="seg-btn border px-3 py-1.5"
          style={{ borderColor: 'var(--rule-strong)' }}
        >
          Retry Sync
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading facility ledger">
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className="h-10 rounded animate-pulse"
            style={{ background: 'var(--paper)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search, Zone Filter, Date Filter, CSV Export */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search facility, zone, sensor..."
              aria-label="Search explorer rows"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border bg-transparent"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
            />
          </div>

          <select
            aria-label="Filter by zone"
            value={zoneFilter}
            onChange={e => {
              setZoneFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-2.5 py-1.5 text-xs rounded border bg-transparent"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            {zones.map(z => (
              <option key={z} value={z} className="text-slate-900">
                {z === 'ALL' ? 'All Zones' : z}
              </option>
            ))}
          </select>

          <div className="seg-group" role="group" aria-label="Filter by date range">
            {(
              [
                { id: 'all', label: 'All Dates' },
                { id: '7d', label: '7d' },
                { id: '14d', label: '14d' },
                { id: '30d', label: '30d' },
              ] as const
            ).map(d => (
              <button
                key={d.id}
                type="button"
                className="seg-btn"
                aria-pressed={dateFilter === d.id}
                onClick={() => {
                  setDateFilter(d.id);
                  setPage(1);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={sorted.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono font-semibold cursor-pointer disabled:opacity-45"
          style={{
            background: 'var(--band)',
            color: 'var(--band-ink)',
            borderColor: 'var(--band)',
          }}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Download CSV ({sorted.length}) ↓
        </button>
      </div>

      {/* Data Table / Empty State */}
      {paged.items.length === 0 ? (
        <div
          className="p-8 text-center rounded border space-y-2"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
        >
          <div className="text-sm font-semibold">No telemetry records match the active filter</div>
          <p className="text-xs opacity-75">
            Adjust search terms, select a broader date window, or switch source mode in Controls.
          </p>
          {(searchQuery || zoneFilter !== 'ALL' || dateFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setZoneFilter('ALL');
                setDateFilter('all');
              }}
              className="seg-btn border mt-2"
              style={{ borderColor: 'var(--rule-strong)' }}
            >
              Reset Table Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded" style={{ borderColor: 'var(--rule)' }}>
          <table className="fig-data-table w-full min-w-[620px]">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort('facilityName')}
                    className="font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Facility / Node {sortKey === 'facilityName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort('isoDate')}
                    className="font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Date {sortKey === 'isoDate' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    onClick={() => toggleSort('flowRateLpm')}
                    className="font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Flow (L/m) {sortKey === 'flowRateLpm' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    onClick={() => toggleSort('dailyLiters')}
                    className="font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Daily Volume {sortKey === 'dailyLiters' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    onClick={() => toggleSort('utilizationPct')}
                    className="font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Util % {sortKey === 'utilizationPct' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>Trend</th>
                <th>INA219 Power</th>
              </tr>
            </thead>
            <tbody>
              {paged.items.map(row => {
                const barW = Math.max(6, Math.round((row.dailyLiters / maxDaily) * 100));
                const sMin = Math.min(...row.sparkline);
                const sMax = Math.max(...row.sparkline);
                const pts = row.sparkline
                  .map((v, i) => {
                    const x = i * 13;
                    const y =
                      sMax === sMin ? 10 : 18 - ((v - sMin) / (sMax - sMin)) * 14;
                    return `${x},${y.toFixed(1)}`;
                  })
                  .join(' ');

                return (
                  <tr key={row.id}>
                    <td>
                      <div className="font-semibold text-xs">{row.facilityName}</div>
                      <div className="mono-meta text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {row.zone} · {row.sensorModel}
                      </div>
                    </td>
                    <td className="mono-meta text-xs whitespace-nowrap">{row.isoDate}</td>
                    <td className="num mono-meta font-semibold">{row.flowRateLpm.toFixed(1)}</td>
                    <td className="num">
                      <div className="flex items-center justify-end gap-2">
                        <span className="mono-meta font-semibold">
                          {formatNumber(row.dailyLiters)} L
                        </span>
                        <span
                          className="hidden sm:inline-block w-16 h-2 rounded-sm overflow-hidden"
                          style={{ background: 'var(--paper)' }}
                        >
                          <span
                            className="block h-full"
                            style={{
                              width: `${barW}%`,
                              background:
                                row.provenance === 'physical'
                                  ? 'var(--series-c)'
                                  : 'var(--brand-band)',
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="num mono-meta">{row.utilizationPct.toFixed(0)}%</td>
                    <td>
                      <svg
                        width="56"
                        height="20"
                        viewBox="0 0 54 20"
                        aria-hidden="true"
                      >
                        <polyline
                          fill="none"
                          stroke={
                            row.provenance === 'physical'
                              ? 'var(--series-c)'
                              : 'var(--brand-band)'
                          }
                          strokeWidth="1.75"
                          points={pts}
                        />
                      </svg>
                    </td>
                    <td className="mono-meta text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      {row.ina219Status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {paged.totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mono-meta">
          <span style={{ color: 'var(--ink-muted)' }}>
            Page {paged.currentPage} of {paged.totalPages} · {paged.totalItems} records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={paged.currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="seg-btn border disabled:opacity-40"
              style={{ borderColor: 'var(--rule)' }}
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={paged.currentPage >= paged.totalPages}
              onClick={() => setPage(p => Math.min(paged.totalPages, p + 1))}
              className="seg-btn border disabled:opacity-40"
              style={{ borderColor: 'var(--rule)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
