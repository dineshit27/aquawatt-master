import React, { useMemo, useState } from 'react';
import { MatrixGroupKey, MatrixUnit } from '../../types/businessAnalytics';
import { formatNumber } from '../../utils/businessAnalyticsMath';

export interface TooltipCallbacks {
  onShowTooltip: (x: number, y: number, title: string, meta: string) => void;
  onHideTooltip: () => void;
}

interface UnitMatrixChartProps extends TooltipCallbacks {
  units: ReadonlyArray<MatrixUnit>;
}

const ROLE_COLORS: Record<MatrixUnit['sensorRole'], string> = {
  'FS-S401 Flow': 'var(--series-a)',
  '16x2 LCD Relay': 'var(--series-c)',
  'INA219 Pending': 'var(--series-d)',
  'Simulated Meter': 'var(--series-b)',
};

export const UnitMatrixChart: React.FC<UnitMatrixChartProps> = ({
  units,
  onShowTooltip,
  onHideTooltip,
}) => {
  const [groupBy, setGroupBy] = useState<MatrixGroupKey>('all');

  const grouped = useMemo(() => {
    if (groupBy === 'all') {
      return [{ groupName: 'All Active Metered Nodes', items: [...units] }];
    }
    const map = new Map<string, MatrixUnit[]>();
    for (const u of units) {
      const key =
        groupBy === 'zone'
          ? u.zone
          : groupBy === 'tier'
          ? u.tier
          : u.sensorRole;
      const list = map.get(key) ?? [];
      list.push(u);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [units, groupBy]);

  if (units.length === 0) {
    return (
      <div
        className="p-6 text-center rounded border text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-muted)' }}
      >
        No verified physical unit packets stored yet in Supabase. Switch to Hybrid Audit or ingest FS-S401 frames via ESP32.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="seg-group" role="group" aria-label="Group unit matrix by">
          {(
            [
              { id: 'all', label: 'All Units' },
              { id: 'zone', label: 'Zone' },
              { id: 'tier', label: 'Demand Tier' },
              { id: 'sensor', label: 'Sensor Role' },
            ] as const
          ).map(opt => (
            <button
              key={opt.id}
              type="button"
              className="seg-btn"
              aria-pressed={groupBy === opt.id}
              onClick={() => setGroupBy(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] mono-meta">
          {(['FS-S401 Flow', '16x2 LCD Relay', 'INA219 Pending', 'Simulated Meter'] as const).map(role => (
            <span key={role} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-[2px] inline-block"
                style={{ background: ROLE_COLORS[role] }}
                aria-hidden="true"
              />
              <span>{role}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(group => {
          const cols = groupBy === 'all' ? 20 : 12;
          const rows = Math.ceil(group.items.length / cols);
          const cell = 13;
          const gap = 3;
          const w = cols * (cell + gap);
          const h = Math.max(24, rows * (cell + gap));

          return (
            <div key={group.groupName} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] mono-meta">
                <span className="font-semibold uppercase tracking-wider">{group.groupName}</span>
                <span>{group.items.length} units</span>
              </div>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="w-full max-w-full block h-auto"
                role="img"
                aria-label={`${group.groupName}: ${group.items.length} telemetry units`}
              >
                {group.items.map((unit, idx) => {
                  const col = idx % cols;
                  const row = Math.floor(idx / cols);
                  const x = col * (cell + gap);
                  const y = row * (cell + gap);
                  const fill = ROLE_COLORS[unit.sensorRole];
                  const title = `${unit.label} (${unit.zone})`;
                  const meta = `${unit.sensorRole} · ${formatNumber(unit.dailyLiters)} L/day · ${unit.efficiencyPct}% eff`;

                  return (
                    <rect
                      key={unit.id}
                      x={x}
                      y={y}
                      width={cell}
                      height={cell}
                      rx={2}
                      fill={fill}
                      fillOpacity={unit.sensorRole === 'INA219 Pending' ? 0.65 : 0.92}
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${title}: ${meta}`}
                      className="cursor-pointer transition-opacity hover:opacity-100 focus:outline-none"
                      onMouseEnter={e => onShowTooltip(e.clientX, e.clientY, title, meta)}
                      onMouseMove={e => onShowTooltip(e.clientX, e.clientY, title, meta)}
                      onMouseLeave={onHideTooltip}
                      onFocus={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        onShowTooltip(rect.left + rect.width / 2, rect.top, title, meta);
                      }}
                      onBlur={onHideTooltip}
                    />
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};
