import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  HOURLY_24H_DATA,
  DAILY_7D_DATA,
  MONTHLY_12M_DATA,
  ZONE_DISTRIBUTIONS,
} from '../data/mockData';
import { telemetryService } from '../services/telemetryService';
import {
  Download,
  Calendar,
  DollarSign,
  Droplet,
  Zap,
  Info,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { PieChart } from '../components/ui/pie-chart';
import { RadarChart } from '../components/ui/radar-chart';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { downloadCsv, downloadJson } from '../utils/exportUtils';
import { DEFAULT_INR_WATER_RATE, DEFAULT_INR_ELECTRICITY_RATE } from '../utils/calculations';
import {
  computeAnalyticsFinancials,
  computeGoalProgress,
} from '../utils/dashboardMetrics';
import { DiurnalLoadHeatmapCard } from '../components/analytics/DiurnalLoadHeatmapCard';
import { SpendWaterfallCard } from '../components/analytics/SpendWaterfallCard';
import { TouCappedBarsCard } from '../components/analytics/TouCappedBarsCard';
import { CircuitBulletGraphCard } from '../components/analytics/CircuitBulletGraphCard';
import { DailySpanDumbbellCard } from '../components/analytics/DailySpanDumbbellCard';

export const Analytics: React.FC = () => {
  const { user, showToast, telemetrySourceMode, setTelemetrySourceMode, isSupabaseReady, hasPhysicalData } = useApp();
  const { reportingPeriod } = useTheme();
  const isPhysical = telemetrySourceMode === 'physical';
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '12m' | 'custom'>(() =>
    reportingPeriod === '7d' ? '7d' : '12m'
  );
  const prevReportingPeriodRef = useRef(reportingPeriod);

  useEffect(() => {
    if (prevReportingPeriodRef.current === reportingPeriod) return;
    prevReportingPeriodRef.current = reportingPeriod;
    if (reportingPeriod === '7d') {
      setTimeRange('7d');
    } else {
      setTimeRange('12m');
    }
  }, [reportingPeriod]);

  const [zoneMetric, setZoneMetric] = useState<'both' | 'water' | 'electricity'>('both');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Controlled Custom Date Range State
  const [startDate, setStartDate] = useState<string>('2026-10-29');
  const [endDate, setEndDate] = useState<string>('2026-11-04');
  const [activeDateRange, setActiveDateRange] = useState<{ start: string; end: string } | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Cost calculation rates in INR (₹)
  const [waterRate, setWaterRate] = useState<number>(DEFAULT_INR_WATER_RATE);
  const [electricityRate, setElectricityRate] = useState<number>(DEFAULT_INR_ELECTRICITY_RATE);

  const customRecords = activeDateRange
    ? telemetryService.getHistoricalDaily(activeDateRange.start, activeDateRange.end)
    : [];

  const currentChartData: Array<{
    label: string;
    water: number;
    electricity: number;
    baselineWater?: number;
    date?: string;
  }> =
    timeRange === '24h'
      ? HOURLY_24H_DATA.map(d => ({
          label: d.hour,
          water: d.waterLiters,
          electricity: d.electricityKwh,
          baselineWater: d.baselineWater,
        }))
      : timeRange === '7d'
      ? DAILY_7D_DATA.map(d => ({
          label: d.dayName,
          water: d.waterCurrent,
          electricity: d.electricityCurrent,
          baselineWater: d.waterPrevious,
          date: d.date,
        }))
      : timeRange === 'custom'
      ? customRecords.map(d => ({
          label: `${d.dayName} (${d.date.slice(5)})`,
          water: d.waterCurrent,
          electricity: d.electricityCurrent,
          baselineWater: d.waterPrevious,
          date: d.date,
        }))
      : MONTHLY_12M_DATA.map(d => ({
          label: d.month,
          water: d.water,
          electricity: d.electricity,
          baselineWater: Math.round(d.water * 1.14),
        }));

  // Strictly reconciled monthly financials
  const financials = useMemo(
    () => computeAnalyticsFinancials(waterRate, electricityRate),
    [waterRate, electricityRate]
  );

  const formattedProjectedTotal = financials.projectedTotalCost.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedProjectedWater = financials.projectedWaterCost.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedProjectedPower = financials.projectedPowerCost.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Goal progress metrics for the 3 summary cards
  const waterGoal = computeGoalProgress(14.2, 16.8, '%'); // 85% toward 16.8% reduction goal
  const powerGoal = computeGoalProgress(8.6, 11.3, '%');  // 76% toward 11.3% peak-shift goal
  const budgetCapInr = 5200;
  const budgetGoal = computeGoalProgress(financials.projectedTotalCost, budgetCapInr, '₹');

  // Ranked zones according to active breakdown tab
  const rankedZones = useMemo(() => {
    const list = [...ZONE_DISTRIBUTIONS];
    if (zoneMetric === 'electricity') {
      return list.sort((a, b) => b.electricitySharePercent - a.electricitySharePercent);
    }
    if (zoneMetric === 'water') {
      return list.sort((a, b) => b.waterSharePercent - a.waterSharePercent);
    }
    return list.sort(
      (a, b) =>
        b.waterSharePercent + b.electricitySharePercent - (a.waterSharePercent + a.electricitySharePercent)
    );
  }, [zoneMetric]);

  const efficiencyRadarData = [
    { metric: 'Water Savings', current: 84, target: 90 },
    { metric: 'Peak Load Shift', current: 76, target: 85 },
    { metric: 'Leak Resilience', current: 91, target: 95 },
    { metric: 'Standby Cut', current: 78, target: 82 },
    { metric: 'Eco Score', current: user?.sustainabilityScore ?? 85, target: 92 },
  ];

  const zoneRadarData = ZONE_DISTRIBUTIONS.map(zone => ({
    zone: zone.zoneName.split(' & ')[0],
    water: zone.waterSharePercent,
    electricity: zone.electricitySharePercent,
  }));

  const handleApplyCustomDate = () => {
    if (!startDate || !endDate) {
      setDateValidationError('Both start date and end date are required.');
      return;
    }
    if (startDate > endDate) {
      setDateValidationError('Start date cannot be after end date.');
      return;
    }

    setDateValidationError(null);
    setActiveDateRange({ start: startDate, end: endDate });
    setTimeRange('custom');
    setIsCustomDateModalOpen(false);

    const matches = telemetryService.getHistoricalDaily(startDate, endDate);
    if (matches.length === 0) {
      showToast(`Custom range applied: 0 records found between ${startDate} and ${endDate}`, 'warning');
    } else {
      showToast(`Custom date range applied (${startDate} to ${endDate}): ${matches.length} daily records loaded`, 'success');
    }
  };

  const handleExport = () => {
    if (currentChartData.length === 0) {
      showToast('Cannot export: No records match the active date window filter', 'warning');
      setIsExportModalOpen(false);
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExportModalOpen(false);

      const filename = `aquawatt-telemetry-${timeRange}-${Date.now()}`;
      if (exportFormat === 'csv') {
        const headers = ['Time Window', 'Water Consumption (Liters)', 'Estimated Water Cost (INR)', 'Power Draw (kWh)', 'Estimated Power Cost (INR)'];
        const rows = currentChartData.map(d => [
          d.date ? `${d.date} (${d.label})` : d.label,
          d.water,
          (d.water * waterRate).toFixed(2),
          d.electricity,
          (d.electricity * electricityRate).toFixed(2),
        ]);
        downloadCsv(`${filename}.csv`, headers, rows);
      } else {
        downloadJson(`${filename}.json`, {
          facility: user?.facilityName || 'AquaWatt Facility Console',
          telemetryWindow: timeRange,
          customDateRange: activeDateRange,
          currency: 'INR',
          appliedRates: {
            waterPerLiter: waterRate,
            electricityPerKwh: electricityRate,
          },
          exportedAt: new Date().toISOString(),
          recordCount: currentChartData.length,
          isDemonstrationData: true,
          records: currentChartData.map(d => ({
            period: d.label,
            date: d.date,
            waterLiters: d.water,
            waterCostInr: Number((d.water * waterRate).toFixed(2)),
            electricityKwh: d.electricity,
            electricityCostInr: Number((d.electricity * electricityRate).toFixed(2)),
          })),
        });
      }

      showToast(`Exported ${currentChartData.length} records as .${exportFormat.toUpperCase()}`, 'success');
    }, 400);
  };

  return (
    <AppLayout title="Consumption & Cost Analytics">
      <div className="space-y-5">
        {/* TOP HEADER & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              Telemetry &amp; Cost Analytics
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {isPhysical ? 'Physical Session · Demo Benchmark Model' : 'Demo Benchmark'}
            </span>
            <span
              title="Historical trends, time-of-use tariff modeling, zone share rankings, and ESG benchmarks"
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-4 h-4" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Analytics time range"
              className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono"
            >
              {(['24h', '7d', '12m'] as const).map(range => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={timeRange === range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range === '24h' ? '24h' : range === '7d' ? '7d' : '12m'}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={timeRange === 'custom'}
                onClick={() => setIsCustomDateModalOpen(true)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  timeRange === 'custom'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Custom Date Window"
                aria-label="Select Custom Date Window"
              >
                <Calendar className="w-3.5 h-3.5" />
                {timeRange === 'custom' && activeDateRange && (
                  <span className="text-[11px] font-mono hidden md:inline tabular-nums">
                    {activeDateRange.start} → {activeDateRange.end}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#121B2B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {isPhysical && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong className="font-semibold">Physical Hardware Boundary Notice:</strong>{' '}
              Multi-circuit energy Analytics below are modeled from calibrated Demo testbench baselines because physical{' '}
              <span className="font-mono">INA219</span> power calibration is currently pending (
              {isSupabaseReady && hasPhysicalData ? 'FS-S401 water flow synced on Dashboard' : 'awaiting Supabase ingestion'}).
            </div>
            <button
              type="button"
              onClick={() => setTelemetrySourceMode('demo')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-mono font-medium shrink-0 hover:bg-amber-100/60 dark:hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Switch to Demo
            </button>
          </div>
        )}

        {/* 3 SUMMARY CARDS — Quiet Surface, Monochrome Icon Square, Bullet Tick Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Water Usage Change */}
          <div
            className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 shadow-xs"
            title="Monthly water consumption delta against pre-installation baseline (target: −16.8%)"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Water Usage vs Baseline
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Droplet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2 tabular-nums">
              <span className="text-[28px] leading-none font-semibold font-mono text-slate-900 dark:text-white">
                −14.2%
              </span>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50/90 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400">
                9,840 L / mo
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70">
              <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible">
                <div
                  className="bg-[#174A8B] dark:bg-sky-400 h-full rounded-full"
                  style={{ width: `${waterGoal.barWidthPercent}%` }}
                />
                <span
                  className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
                  style={{ left: `${waterGoal.targetMarkerPercent}%` }}
                  title="Target: 16.8% reduction"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>Goal −16.8%</span>
                <span>{waterGoal.percentOfGoal}% met</span>
              </div>
            </div>
          </div>

          {/* Card 2: Power Load Change */}
          <div
            className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 shadow-xs"
            title="Monthly electrical load delta against historical benchmark (target: −11.3%)"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Power Load vs Baseline
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2 tabular-nums">
              <span className="text-[28px] leading-none font-semibold font-mono text-slate-900 dark:text-white">
                −8.6%
              </span>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50/90 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400">
                542.4 kWh / mo
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70">
              <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible">
                <div
                  className="bg-[#237A57] dark:bg-emerald-400 h-full rounded-full"
                  style={{ width: `${powerGoal.barWidthPercent}%` }}
                />
                <span
                  className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
                  style={{ left: `${powerGoal.targetMarkerPercent}%` }}
                  title="Target: 11.3% peak shift"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>Goal −11.3%</span>
                <span>{powerGoal.percentOfGoal}% met</span>
              </div>
            </div>
          </div>

          {/* Card 3: Projected Utility Bill */}
          <div
            className="p-5 rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 shadow-xs"
            title="Monthly utility bill computed from active water and electricity tariff sliders"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Projected Monthly Bill
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2 tabular-nums">
              <span className="text-[28px] leading-none font-semibold font-mono text-slate-900 dark:text-white">
                ₹{formattedProjectedTotal}
              </span>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50/90 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400">
                −₹840 MoM
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70">
              <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible">
                <div
                  className="bg-[#237A57] dark:bg-emerald-400 h-full rounded-full"
                  style={{ width: `${budgetGoal.barWidthPercent}%` }}
                />
                <span
                  className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
                  style={{ left: `${budgetGoal.targetMarkerPercent}%` }}
                  title={`Monthly cap ₹${budgetCapInr.toLocaleString('en-IN')}`}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                <span>Water ₹{formattedProjectedWater}</span>
                <span>Power ₹{formattedProjectedPower}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MULTI-RESOURCE TREND VS BASELINE */}
        <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/60 gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
                Multi-Resource Trend
              </h3>
              <span
                title="Compares current water (L) and power (kWh) telemetry against previous baseline"
                className="text-slate-400 hover:text-slate-600 cursor-help"
              >
                <Info className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#174A8B]" /> Water (L)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#237A57]" /> Power (kWh)
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 border-t border-dashed border-slate-400" /> Baseline
              </span>
            </div>
          </div>

          <div className="h-76 w-full mt-4 flex items-center justify-center">
            {currentChartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <Calendar className="w-9 h-9 text-slate-400 mb-2" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No sensor telemetry recorded for selected range
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {activeDateRange
                    ? `No ESP32 records between ${activeDateRange.start} and ${activeDateRange.end}.`
                    : 'Choose another monitoring window to view telemetry.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCustomDateModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white text-xs font-medium cursor-pointer"
                >
                  Adjust Date Window
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anaWaterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#174A8B" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#174A8B" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="anaElecGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#237A57" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#237A57" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAF0" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="water"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <YAxis
                    yAxisId="power"
                    orientation="right"
                    stroke="#237A57"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}kWh`}
                  />
                  {timeRange === '7d' && (
                    <ReferenceLine
                      yAxisId="water"
                      y={420}
                      stroke="#94A3B8"
                      strokeDasharray="4 4"
                      label={{ value: 'Target 420 L', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10 }}
                    />
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as {
                          label: string;
                          date?: string;
                          water: number;
                          electricity: number;
                          baselineWater?: number;
                        };
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-mono border border-slate-700 tabular-nums">
                            <p className="font-semibold text-slate-300 pb-1 border-b border-slate-800">
                              {data.date ? `${data.date} · ${data.label}` : data.label}
                            </p>
                            <div className="space-y-1 mt-1.5">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sky-300">Water</span>
                                <span className="font-semibold">{data.water.toLocaleString()} L</span>
                              </div>
                              {data.baselineWater != null && (
                                <div className="flex items-center justify-between gap-4 text-slate-400">
                                  <span>Baseline</span>
                                  <span>{data.baselineWater.toLocaleString()} L</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-emerald-300">Power</span>
                                <span className="font-semibold">{data.electricity} kWh</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {currentChartData[0]?.baselineWater != null && (
                    <Area
                      yAxisId="water"
                      type="monotone"
                      dataKey="baselineWater"
                      stroke="#94A3B8"
                      strokeWidth={1.25}
                      strokeDasharray="4 4"
                      fill="none"
                      name="Baseline"
                    />
                  )}
                  <Area
                    yAxisId="water"
                    type="monotone"
                    dataKey="water"
                    stroke="#174A8B"
                    strokeWidth={1.75}
                    fillOpacity={1}
                    fill="url(#anaWaterGrad)"
                    name="Water"
                  />
                  <Area
                    yAxisId="power"
                    type="monotone"
                    dataKey="electricity"
                    stroke="#237A57"
                    strokeWidth={1.75}
                    fillOpacity={1}
                    fill="url(#anaElecGrad)"
                    name="Electricity"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ZONE BREAKDOWN (3px SLIM SHARE BARS) & CONFIGURABLE TARIFF */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Zone Breakdown */}
          <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
                  Facility Zone Share
                </h3>
                <span
                  title="Ranked share of total monthly water (9,840 L) and power (542.4 kWh) across sub-circuits"
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                role="group"
                aria-label="Filter zone breakdown metric"
                className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono"
              >
                {(['both', 'water', 'electricity'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={zoneMetric === tab}
                    onClick={() => setZoneMetric(tab)}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      zoneMetric === tab
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab === 'both' ? 'All' : tab === 'water' ? 'Water' : 'Power'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/70">
              {rankedZones.map(zone => (
                <div key={zone.id} className="py-2.5 text-xs tabular-nums">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate min-w-0">
                      {zone.zoneName}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] shrink-0">
                      {(zoneMetric === 'both' || zoneMetric === 'water') && (
                        <span className="text-[#174A8B] dark:text-sky-400">
                          {zone.waterSharePercent}% · {zone.waterLiters.toLocaleString()} L
                        </span>
                      )}
                      {(zoneMetric === 'both' || zoneMetric === 'electricity') && (
                        <span className="text-[#237A57] dark:text-emerald-400">
                          {zone.electricitySharePercent}% · {zone.electricityKwh} kWh
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slim 3px rounded share track(s) */}
                  <div className="mt-1.5 space-y-1">
                    {(zoneMetric === 'both' || zoneMetric === 'water') && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-[3px] overflow-hidden">
                        <div
                          className="bg-[#174A8B] dark:bg-sky-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${zone.waterSharePercent}%` }}
                        />
                      </div>
                    )}
                    {(zoneMetric === 'both' || zoneMetric === 'electricity') && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-[3px] overflow-hidden">
                        <div
                          className="bg-[#237A57] dark:bg-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${zone.electricitySharePercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configurable Tariff Estimator */}
          <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading">
                    Tariff & Bill Estimator
                  </h3>
                  <span
                    title="Adjust municipal water (₹/1,000 L) and grid electricity (₹/kWh) tariffs to model monthly expenditure"
                    className="text-slate-400 hover:text-slate-600 cursor-help"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {financials.monthlyWaterLiters.toLocaleString()} L · {financials.monthlyPowerKwh} kWh
                </span>
              </div>

              <div className="mt-5 space-y-5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5 tabular-nums">
                    <label
                      htmlFor="water-tariff-slider"
                      className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Droplet className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
                      Water Tariff
                    </label>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{(waterRate * 1000).toFixed(2)} / kL
                    </span>
                  </div>
                  <input
                    id="water-tariff-slider"
                    type="range"
                    min="0.010"
                    max="0.080"
                    step="0.005"
                    value={waterRate}
                    onChange={e => setWaterRate(parseFloat(e.target.value))}
                    className="w-full accent-[#174A8B] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 tabular-nums">
                    <label
                      htmlFor="power-tariff-slider"
                      className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />
                      Grid Tariff
                    </label>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{electricityRate.toFixed(2)} / kWh
                    </span>
                  </div>
                  <input
                    id="power-tariff-slider"
                    type="range"
                    min="4.00"
                    max="15.00"
                    step="0.50"
                    value={electricityRate}
                    onChange={e => setElectricityRate(parseFloat(e.target.value))}
                    className="w-full accent-[#237A57] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Projected Monthly Bill
                </span>
                <div className="text-2xl font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                  ₹{formattedProjectedTotal}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Water ₹{formattedProjectedWater} · Power ₹{formattedProjectedPower}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-[#237A57] dark:text-emerald-400 font-semibold block">
                  +₹750 / mo
                </span>
                <span className="text-[11px] text-slate-400 font-mono">schedule savings</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-DAY X 2-HOUR DIURNAL LOAD HEATMAP */}
        <DiurnalLoadHeatmapCard />

        {/* WATERFALL SAVINGS BRIDGE & 24H TOU CAPPED BARS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SpendWaterfallCard waterRate={waterRate} electricityRate={electricityRate} />
          <TouCappedBarsCard waterRate={waterRate} electricityRate={electricityRate} />
        </div>

        {/* CIRCUIT TARGET BULLET GRAPH & BASELOAD-TO-PEAK SWING DUMBBELL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CircuitBulletGraphCard />
          <DailySpanDumbbellCard />
        </div>

        {/* RADAR TELEMETRY & CONSERVATION BENCHMARK ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Conservation Efficiency</CardTitle>
                <span
                  title="Facility conservation metrics vs monthly benchmark targets (0–100 scale)"
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <RadarChart
                containerHeight={300}
                data={efficiencyRadarData}
                dataKey="metric"
                series={[
                  { dataKey: 'current', fillOpacity: 0.25 },
                  { dataKey: 'target', fillOpacity: 0.1 },
                ]}
                config={{
                  current: {
                    label: 'Current',
                    color: '#237A57',
                  },
                  target: {
                    label: 'Target',
                    color: '#174A8B',
                  },
                }}
                radiusAxisProps={{ domain: [0, 100] }}
                valueSuffix=" pts"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Zone Load Profile</CardTitle>
                <span
                  title="Water vs electricity load share (%) across monitored facility circuits"
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <RadarChart
                containerHeight={300}
                data={zoneRadarData}
                dataKey="zone"
                series={[
                  { dataKey: 'water', fillOpacity: 0.22 },
                  { dataKey: 'electricity', fillOpacity: 0.22 },
                ]}
                config={{
                  water: {
                    label: 'Water Share',
                    color: '#174A8B',
                  },
                  electricity: {
                    label: 'Power Share',
                    color: '#237A57',
                  },
                }}
                radiusAxisProps={{ domain: [0, 50] }}
                valueSuffix="%"
              />
            </CardContent>
          </Card>
        </div>

        {/* MONTHLY UTILITY SPEND & CIRCUIT POWER DONUTS — RECONCILED TOTALS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Monthly Spend Breakdown</CardTitle>
                <span
                  title="Projected INR spend across zones reconciled directly with active tariff sliders"
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <PieChart
                containerHeight={220}
                data={financials.utilitySpendData}
                dataKey="amount"
                nameKey="name"
                variant="donut"
                valuePrefix="₹"
                legendFractionDigits={2}
                config={{
                  'HVAC & Climate': { label: 'HVAC & Climate', color: '#174A8B' },
                  'Bathrooms & Laundry': { label: 'Bath & Laundry', color: '#237A57' },
                  'Kitchen & Dining': { label: 'Kitchen & Dining', color: '#38BDF8' },
                  'Irrigation & Lighting': { label: 'Irrigation & Aux', color: '#94A3B8' },
                }}
              >
                <Pie
                  data={financials.utilitySpendData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="82%"
                  startAngle={90}
                  endAngle={-270}
                  strokeLinejoin="round"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {['#174A8B', '#237A57', '#38BDF8', '#94A3B8'].map((hex, index) => (
                    <Cell key={financials.utilitySpendData[index]?.name ?? index} fill={hex} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground font-mono font-semibold text-lg tabular-nums"
                >
                  ₹{formattedProjectedTotal}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  className="fill-muted-foreground text-xs"
                >
                  Projected total
                </text>
              </PieChart>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Circuit Power Draw</CardTitle>
                <span
                  title="Monthly kWh circuit distribution totaling 542.4 kWh across sub-meters"
                  className="text-slate-400 hover:text-slate-600 cursor-help"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <PieChart
                containerHeight={220}
                data={financials.energyMixData}
                dataKey="kwh"
                nameKey="name"
                variant="donut"
                valueSuffix=" kWh"
                legendFractionDigits={1}
                config={{
                  'HVAC Compressor': { label: 'HVAC Compressor', color: '#237A57' },
                  'Bathrooms & Heating': { label: 'Water Heating', color: '#174A8B' },
                  'Kitchen Appliances': { label: 'Kitchen Loads', color: '#38BDF8' },
                  'Lighting & Standby': { label: 'Lighting & Aux', color: '#94A3B8' },
                }}
              >
                <Pie
                  data={financials.energyMixData}
                  dataKey="kwh"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="82%"
                  startAngle={90}
                  endAngle={-270}
                  strokeLinejoin="round"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {['#237A57', '#174A8B', '#38BDF8', '#94A3B8'].map((hex, index) => (
                    <Cell key={financials.energyMixData[index]?.name ?? index} fill={hex} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground font-mono font-semibold text-lg tabular-nums"
                >
                  {financials.totalMonthlyKwh.toLocaleString('en-IN')} kWh
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  className="fill-muted-foreground text-xs"
                >
                  Monthly draw
                </text>
              </PieChart>
            </CardContent>
          </Card>
        </div>

        {/* MODAL: EXPORT AUDIT REPORT */}
        <Modal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="Export Facility Telemetry Report"
          description="Download actual CSV or JSON telemetry data from the active monitoring window."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Export File Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['csv', 'json'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    aria-pressed={exportFormat === fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`p-3 rounded-lg border text-center font-mono font-medium uppercase transition-colors cursor-pointer ${
                      exportFormat === fmt
                        ? 'border-[#174A8B] bg-blue-50/50 dark:bg-sky-950/40 text-[#174A8B] dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    .{fmt} (Downloadable)
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-mono text-[11px] space-y-1">
              <p>Facility: {user?.facilityName || 'AquaWatt Facility Console'}</p>
              <p>Selected Window: {timeRange.toUpperCase()}</p>
              <p>Transport: ESP32 Wi-Fi &amp; MQTT Telemetry Feeds</p>
              <p>
                Status:{' '}
                {isPhysical
                  ? 'Hardware FS-S401 Session · Demo Multi-Circuit Analytical Breakdown'
                  : 'Demonstration Mock Data Export'}
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isExporting ? 'Compiling File...' : 'Download Export'}
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL: CUSTOM DATE RANGE SELECTOR */}
        <Modal
          isOpen={isCustomDateModalOpen}
          onClose={() => {
            setIsCustomDateModalOpen(false);
            setDateValidationError(null);
          }}
          title="Select Custom Date Window"
          description="Filter sensor telemetry for specific billing or incident investigation windows."
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="analytics-start-date" className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
                Start Date
              </label>
              <input
                id="analytics-start-date"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateValidationError(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
              />
            </div>
            <div>
              <label htmlFor="analytics-end-date" className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
                End Date
              </label>
              <input
                id="analytics-end-date"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateValidationError(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
              />
            </div>

            {dateValidationError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {dateValidationError}
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-mono">
              Available Testbench Range: 2026-10-01 to 2026-11-05. Queries outside this range demonstrate empty-state handling.
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomDateModalOpen(false);
                  setDateValidationError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDate}
                className="px-4 py-2 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white font-semibold transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};
