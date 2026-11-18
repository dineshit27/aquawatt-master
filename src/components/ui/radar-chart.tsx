"use client";

import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
  type PolarRadiusAxisProps,
} from "recharts";
import { cn } from "../../lib/utils";

export interface RadarSeriesConfig {
  label: string;
  color: string;
}

export interface RadarSeriesItem {
  dataKey: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

export interface RadarChartProps {
  data: Record<string, string | number>[];
  dataKey: string;
  series: RadarSeriesItem[];
  config: Record<string, RadarSeriesConfig>;
  containerHeight?: number;
  radiusAxisProps?: Omit<PolarRadiusAxisProps, "ref">;
  valueSuffix?: string;
  className?: string;
}

export function RadarChart({
  data,
  dataKey,
  series,
  config,
  containerHeight = 320,
  radiusAxisProps,
  valueSuffix = "",
  className,
}: RadarChartProps) {
  return (
    <div
      className={cn(
        "w-full [&_.recharts-polar-angle-axis-tick_text]:fill-slate-600 dark:[&_.recharts-polar-angle-axis-tick_text]:fill-slate-300 [&_.recharts-polar-radius-axis-tick_text]:fill-slate-400 dark:[&_.recharts-polar-radius-axis-tick_text]:fill-slate-500 [&_.recharts-polar-angle-axis_.recharts-polygon]:fill-none [&_.recharts-polar-grid_path]:fill-none",
        className
      )}
    >
      <div className="w-full" style={{ height: containerHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid
              gridType="polygon"
              fill="none"
              fillOpacity={0}
              className="stroke-slate-200 dark:stroke-slate-700/80"
            />
            <PolarAngleAxis
              dataKey={dataKey}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fontWeight: 500,
              }}
            />
            <PolarRadiusAxis
              angle={90}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              {...radiusAxisProps}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-xl tabular-nums">
                    <p className="mb-1 font-medium text-slate-200">
                      {label}
                    </p>
                    <div className="space-y-1 font-mono">
                      {payload.map((entry) => {
                        const key = String(entry.dataKey ?? "");
                        const seriesMeta = config[key];
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span
                                className="size-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    seriesMeta?.color ?? entry.color,
                                }}
                              />
                              {seriesMeta?.label ?? key}
                            </span>
                            <span className="font-semibold text-white">
                              {entry.value}
                              {valueSuffix}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
            {series.map((item) => {
              const meta = config[item.dataKey];
              const strokeColor = meta?.color ?? "#174A8B";
              return (
                <Radar
                  key={item.dataKey}
                  name={meta?.label ?? item.dataKey}
                  dataKey={item.dataKey}
                  stroke={strokeColor}
                  fill={strokeColor}
                  fillOpacity={item.fillOpacity ?? 0.22}
                  strokeWidth={item.strokeWidth ?? 2}
                  isAnimationActive={false}
                  dot={{ r: 3, fillOpacity: 1 }}
                  activeDot={{ r: 4.5 }}
                />
              );
            })}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
        {series.map((item) => {
          const meta = config[item.dataKey];
          return (
            <div
              key={item.dataKey}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: meta?.color ?? "#174A8B" }}
              />
              <span>{meta?.label ?? item.dataKey}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
