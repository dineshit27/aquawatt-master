import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Info } from 'lucide-react';
import { HOURLY_24H_DATA } from '../../data/mockData';
import { buildTouCappedBars, type TouCappedBarPoint } from '../../utils/analyticsVisualizations';

interface TouCappedBarsCardProps {
  waterRate: number;
  electricityRate: number;
}

interface CappedBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: TouCappedBarPoint;
}

const CappedBarShape: React.FC<CappedBarShapeProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}) => {
  if (width <= 0 || height <= 0 || !payload) return null;

  let fillHex = 'rgba(23, 74, 139, 0.18)';
  let capHex = '#174A8B';

  if (payload.isAnomaly) {
    fillHex = 'rgba(217, 119, 6, 0.22)';
    capHex = '#D97706';
  } else if (payload.tariffTier === 'off-peak') {
    fillHex = 'rgba(35, 122, 87, 0.18)';
    capHex = '#237A57';
  } else if (payload.tariffTier === 'peak') {
    fillHex = 'rgba(217, 119, 6, 0.16)';
    capHex = '#D97706';
  }

  const capHeight = Math.min(3, height);

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill={fillHex} />
      <rect x={x} y={y} width={width} height={capHeight} rx={1.5} fill={capHex} />
    </g>
  );
};

export const TouCappedBarsCard: React.FC<TouCappedBarsCardProps> = ({
  waterRate,
  electricityRate,
}) => {
  const [metric, setMetric] = useState<'electricityKwh' | 'waterLiters' | 'costInr'>(
    'electricityKwh'
  );

  const data = useMemo(
    () => buildTouCappedBars(HOURLY_24H_DATA, waterRate, electricityRate),
    [waterRate, electricityRate]
  );

  const avgValue = useMemo(() => {
    const sum = data.reduce((s, d) => s + d[metric], 0);
    return Number((sum / data.length).toFixed(2));
  }, [data, metric]);

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
              24h Time-of-Use Load Envelope
            </h3>
            <span
              title="Pastel bars with solid 3 px caps segment Off-Peak (00–06h), Standard, Peak (16–20h), and 02:00 nocturnal leak windows"
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            role="group"
            aria-label="Select Time-of-Use chart metric"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono"
          >
            {(
              [
                { id: 'electricityKwh', label: 'kWh' },
                { id: 'waterLiters', label: 'Water' },
                { id: 'costInr', label: 'Cost (₹)' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={metric === tab.id}
                onClick={() => setMetric(tab.id)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  metric === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAF0" opacity={0.4} />
              <XAxis
                dataKey="hour"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(h: string) => h.slice(0, 2)}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  metric === 'costInr'
                    ? `₹${v}`
                    : metric === 'electricityKwh'
                    ? `${v}`
                    : `${v}L`
                }
              />
              <ReferenceLine
                y={avgValue}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{
                  value: `Mean ${avgValue}`,
                  position: 'insideTopLeft',
                  fill: '#94A3B8',
                  fontSize: 10,
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as TouCappedBarPoint;
                  const tierLabel = item.isAnomaly
                    ? 'Nocturnal Anomaly'
                    : item.tariffTier === 'off-peak'
                    ? 'Off-Peak (0.85×)'
                    : item.tariffTier === 'peak'
                    ? 'Peak Slab (1.25×)'
                    : 'Standard Slab';

                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-xl font-mono tabular-nums">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                        <span className="font-sans font-medium text-slate-200">{item.hour}</span>
                        <span
                          className={
                            item.isAnomaly || item.tariffTier === 'peak'
                              ? 'text-amber-400'
                              : item.tariffTier === 'off-peak'
                              ? 'text-emerald-400'
                              : 'text-sky-300'
                          }
                        >
                          {tierLabel}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Power</span>
                          <span>{item.electricityKwh.toFixed(2)} kWh</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Water</span>
                          <span>{item.waterLiters} L</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Est. Cost</span>
                          <span className="font-semibold">₹{item.costInr.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey={metric}
                shape={<CappedBarShape />}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-full bg-[#237A57]" /> Off-Peak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-full bg-[#174A8B]" /> Standard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-full bg-[#D97706]" /> Peak / Leak
          </span>
        </div>
        <span className="tabular-nums">18:00 Peak · 02:00 Leak</span>
      </div>
    </div>
  );
};
