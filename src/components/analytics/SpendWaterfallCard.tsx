import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Info } from 'lucide-react';
import { buildSpendWaterfallSteps } from '../../utils/analyticsVisualizations';

interface SpendWaterfallCardProps {
  waterRate: number;
  electricityRate: number;
}

export const SpendWaterfallCard: React.FC<SpendWaterfallCardProps> = ({
  waterRate,
  electricityRate,
}) => {
  const steps = useMemo(
    () => buildSpendWaterfallSteps(waterRate, electricityRate),
    [waterRate, electricityRate]
  );

  const chartData = useMemo(
    () =>
      steps.map(step => ({
        ...step,
        offset: Math.min(step.start, step.end),
        span: Number(Math.abs(step.end - step.start).toFixed(2)),
      })),
    [steps]
  );

  const baselineVal = steps[0]?.end ?? 0;
  const projectedVal = steps[steps.length - 1]?.end ?? 0;
  const savedTotal = Number((baselineVal - projectedVal).toFixed(2));

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
              Bill Savings Waterfall
            </h3>
            <span
              title="Reconciled monthly bridge from pre-schedule baseline to projected INR spend under active tariffs"
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>

          <span className="text-[11px] font-mono font-medium text-[#237A57] dark:text-emerald-400 tabular-nums">
            −₹{savedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAF0" opacity={0.4} />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as (typeof chartData)[number];
                  const formattedDelta =
                    item.kind === 'savings'
                      ? `−₹${Math.abs(item.delta).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : `₹${item.end.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-xl font-mono tabular-nums">
                      <div className="font-sans font-medium text-slate-200">{item.label}</div>
                      <div className="mt-1 font-semibold text-white">{formattedDelta}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.fact} · Running ₹
                        {item.end.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="offset" stackId="wf" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="span" stackId="wf" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                {chartData.map(entry => (
                  <Cell
                    key={entry.id}
                    fill={
                      entry.kind === 'baseline'
                        ? '#94A3B8'
                        : entry.kind === 'projected'
                        ? '#174A8B'
                        : '#237A57'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Baseline ₹
            {baselineVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#237A57]" /> Conservation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#174A8B]" /> Projected
          </span>
        </div>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          ₹{projectedVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};
