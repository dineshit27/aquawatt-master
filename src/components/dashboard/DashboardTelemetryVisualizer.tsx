import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { telemetryService, DiurnalPoint } from '../../services/telemetryService';
import { supabaseTelemetryService } from '../../services/supabaseTelemetryService';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Database, Info } from 'lucide-react';

type VisualizerMetricMode = 'volume' | 'cost' | 'carbon';

interface DashboardTelemetryVisualizerProps {
  timeRange?: '8h' | '24h' | '30d';
}

export const DashboardTelemetryVisualizer: React.FC<DashboardTelemetryVisualizerProps> = ({
  timeRange = '24h',
}) => {
  const { telemetrySourceMode, hasPhysicalData } = useApp();
  const isPhysical = telemetrySourceMode === 'physical';
  const [metricMode, setMetricMode] = useState<VisualizerMetricMode>('volume');
  const [showAnomalyZone, setShowAnomalyZone] = useState<boolean>(true);
  const [physicalHistory, setPhysicalHistory] = useState<DiurnalPoint[]>([]);
  const [loadingPhysical, setLoadingPhysical] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!isPhysical) {
      setPhysicalHistory([]);
      setLoadingPhysical(false);
      return;
    }

    setLoadingPhysical(true);
    supabaseTelemetryService
      .fetchHistoricalReadings(timeRange)
      .then(rows => {
        if (active) {
          setPhysicalHistory(rows);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPhysical(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isPhysical, timeRange, hasPhysicalData]);

  const rawData: DiurnalPoint[] = isPhysical
    ? physicalHistory
    : telemetryService.getDiurnalData(timeRange);

  const chartData = rawData.map(d => {
    if (metricMode === 'cost') {
      return {
        label: d.label,
        waterVal: d.waterCostInr,
        electricVal: d.electricityCostInr,
        totalVal: Number((d.waterCostInr + d.electricityCostInr).toFixed(2)),
        rawElectricityKwh: d.rawElectricityKwh,
        rawWaterLiters: d.rawWaterLiters,
      };
    }
    if (metricMode === 'carbon') {
      const electricKg = Number((d.rawElectricityKwh * 0.385).toFixed(2));
      const waterKg = Number((d.rawWaterLiters * 0.00032).toFixed(2));
      return {
        label: d.label,
        waterVal: waterKg,
        electricVal: electricKg,
        totalVal: Number((electricKg + waterKg).toFixed(2)),
        rawElectricityKwh: d.rawElectricityKwh,
        rawWaterLiters: d.rawWaterLiters,
      };
    }
    return {
      label: d.label,
      waterVal: d.waterVal,
      electricVal: d.electricVal,
      rawElectricityKwh: d.rawElectricityKwh,
      rawWaterLiters: d.rawWaterLiters,
    };
  });

  const timeRangeBadge =
    timeRange === '8h' ? '8h shift' : timeRange === '30d' ? '30d cycle' : '24h window';

  const headerTooltip = isPhysical
    ? `Physical ESP32 FS-S401 turbine flow via Supabase (${timeRange}); INA219 DC power remains untested`
    : `Simulated ESP32 flow liters vs CT kilowatt demand across ${timeRange}`;

  const peakPoint =
    chartData.length > 0
      ? chartData.reduce((best, cur) =>
          cur.rawWaterLiters > best.rawWaterLiters ? cur : best
        )
      : null;

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
            Diurnal Telemetry
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {timeRangeBadge}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {isPhysical ? 'Supabase' : 'Demo'}
          </span>
          <span title={headerTooltip} className="text-slate-400 hover:text-slate-600 cursor-help">
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isPhysical && timeRange === '24h' && (
            <button
              type="button"
              aria-pressed={showAnomalyZone}
              onClick={() => setShowAnomalyZone(!showAnomalyZone)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
                showAnomalyZone
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>02:00 Anomaly</span>
            </button>
          )}

          <div
            role="group"
            aria-label="Telemetry display metric"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono"
          >
            <button
              type="button"
              aria-pressed={metricMode === 'volume'}
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Volume
            </button>
            <button
              type="button"
              aria-pressed={metricMode === 'cost'}
              onClick={() => setMetricMode('cost')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                metricMode === 'cost'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Cost (₹)
            </button>
            <button
              type="button"
              aria-pressed={metricMode === 'carbon'}
              onClick={() => setMetricMode('carbon')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                metricMode === 'carbon'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              CO₂
            </button>
          </div>
        </div>
      </div>

      {/* Area Chart or Physical Empty State */}
      <div className="h-64 w-full mt-4">
        {isPhysical && chartData.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <Database className="w-7 h-7 text-slate-400 mb-2 opacity-75" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-sans">
              {loadingPhysical
                ? 'Querying Physical Timeseries from Supabase...'
                : 'No Physical Diurnal Telemetry Recorded Yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md font-sans leading-relaxed">
              {loadingPhysical
                ? 'Checking public.sensor_readings for recent FS-S401 pulse flow intervals.'
                : 'Time-series curves populate automatically as physical ESP32 FS-S401 readings are ingested into public.sensor_readings. Demo fixtures are suppressed in Physical mode.'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dash-water-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#174A8B" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#174A8B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dash-power-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#237A57" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#237A57" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const rowPayload = payload[0]?.payload as {
                      rawElectricityKwh?: number;
                    };
                    const powerUntested = isPhysical && (rowPayload?.rawElectricityKwh ?? 0) === 0;
                    return (
                      <div className="rounded-lg bg-slate-900 text-white p-2.5 shadow-xl text-xs font-mono border border-slate-700 tabular-nums">
                        <p className="font-semibold text-slate-300 pb-1 border-b border-slate-800">
                          {label}
                        </p>
                        <div className="space-y-1 mt-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-sky-300">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              Water
                            </span>
                            <span className="font-semibold text-white">
                              {metricMode === 'volume'
                                ? `${payload[0]?.value} L`
                                : metricMode === 'cost'
                                ? `₹${payload[0]?.value}`
                                : `${payload[0]?.value} kg`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Power
                            </span>
                            <span className="font-semibold text-white">
                              {powerUntested
                                ? 'Untested (INA219)'
                                : metricMode === 'volume'
                                ? `${rowPayload?.rawElectricityKwh} kWh`
                                : metricMode === 'cost'
                                ? `₹${payload[1]?.value}`
                                : `${payload[1]?.value} kg`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {!isPhysical && showAnomalyZone && timeRange === '24h' && (
                <ReferenceArea
                  x1="02:00"
                  x2="04:00"
                  stroke="#F59E0B"
                  strokeOpacity={0.65}
                  strokeDasharray="3 3"
                  fill="#FEF3C7"
                  fillOpacity={0.18}
                />
              )}

              <Area
                type="monotone"
                dataKey="waterVal"
                name="Water"
                stroke="#174A8B"
                strokeWidth={1.75}
                fillOpacity={1}
                fill="url(#dash-water-grad)"
              />

              <Area
                type="monotone"
                dataKey="electricVal"
                name="Electricity"
                stroke="#237A57"
                strokeWidth={1.75}
                fillOpacity={1}
                fill="url(#dash-power-grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Compact Legend & Fact Strip */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#174A8B] dark:bg-sky-400" />
            <span>Water ({metricMode === 'volume' ? 'L' : metricMode === 'cost' ? '₹' : 'kg CO₂'})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#237A57] dark:bg-emerald-400" />
            <span>
              Power ({isPhysical ? 'INA219 Pending' : metricMode === 'volume' ? 'kWh' : metricMode === 'cost' ? '₹' : 'kg CO₂'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
          {isPhysical ? (
            <span>
              Peak{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {peakPoint ? `${peakPoint.label} · ${peakPoint.rawWaterLiters} L` : 'Awaiting records'}
              </strong>
            </span>
          ) : (
            <>
              <span>
                Peak{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {timeRange === '8h' ? '18:00 · 84 L' : timeRange === '30d' ? 'Day 7–9 · 1,100 L' : '18:00 · 84 L'}
                </strong>
              </span>
              {timeRange === '24h' && (
                <>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    02:00–04:30 anomaly
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

