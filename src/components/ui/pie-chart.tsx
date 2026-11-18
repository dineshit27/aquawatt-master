"use client";

import React from "react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "../../lib/utils";

export interface PieChartConfigItem {
  label?: string;
  color?: string;
}

export interface PieChartProps {
  data: Record<string, string | number>[];
  dataKey: string;
  nameKey: string;
  config?: Record<string, PieChartConfigItem>;
  containerHeight?: number;
  variant?: "pie" | "donut";
  valuePrefix?: string;
  valueSuffix?: string;
  legendFractionDigits?: number;
  showLegend?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PieChart({
  data,
  dataKey,
  nameKey,
  config = {},
  containerHeight = 220,
  variant = "donut",
  valuePrefix = "",
  valueSuffix = "",
  legendFractionDigits = 0,
  showLegend = true,
  className,
  children,
}: PieChartProps) {
  const total = data.reduce(
    (sum, item) => sum + (Number(item[dataKey]) || 0),
    0
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full" style={{ height: containerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const entry = payload[0];
                const rawName = String(entry.name ?? "");
                const itemConfig = config[rawName];
                const numericVal = Number(entry.value ?? 0);
                const share =
                  total > 0 ? ((numericVal / total) * 100).toFixed(1) : "0.0";
                const index = data.findIndex(
                  (d) => String(d[nameKey]) === rawName
                );
                const dotColor =
                  itemConfig?.color ??
                  `var(--chart-${(index >= 0 ? index : 0) + 1})`;

                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-xl font-mono tabular-nums">
                    <div className="flex items-center gap-2 font-sans font-medium text-slate-200">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span>{itemConfig?.label ?? rawName}</span>
                    </div>
                    <div className="mt-1 text-white font-semibold">
                      {valuePrefix}
                      {numericVal.toLocaleString("en-IN", {
                        minimumFractionDigits: legendFractionDigits,
                        maximumFractionDigits: Math.max(2, legendFractionDigits),
                      })}
                      {valueSuffix} <span className="text-slate-400 font-normal">({share}%)</span>
                    </div>
                  </div>
                );
              }}
            />
            {children ?? (
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                innerRadius={variant === "donut" ? "52%" : 0}
                outerRadius="82%"
                startAngle={90}
                endAngle={-270}
                strokeLinejoin="round"
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((item, index) => (
                  <Cell
                    key={String(item[nameKey] ?? index)}
                    fill={
                      config[String(item[nameKey])]?.color ??
                      `var(--chart-${(index % 6) + 1})`
                    }
                  />
                ))}
              </Pie>
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {showLegend && data.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800/80 tabular-nums">
          {data.map((item, index) => {
            const rawName = String(item[nameKey] ?? index);
            const numericVal = Number(item[dataKey] ?? 0);
            const itemConfig = config[rawName];
            const swatchColor =
              itemConfig?.color ?? `var(--chart-${(index % 6) + 1})`;
            return (
              <div
                key={rawName}
                className="flex items-center justify-between gap-2 min-w-0"
              >
                <span className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-slate-300">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: swatchColor }}
                  />
                  <span className="truncate">{itemConfig?.label ?? rawName}</span>
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-white shrink-0">
                  {valuePrefix}
                  {numericVal.toLocaleString("en-IN", {
                    minimumFractionDigits: legendFractionDigits,
                    maximumFractionDigits: legendFractionDigits,
                  })}
                  {valueSuffix}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
