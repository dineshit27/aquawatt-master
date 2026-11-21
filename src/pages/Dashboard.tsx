import React, { useEffect, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { KpiCard } from '../components/cards/KpiCard';
import { ResourceMetricCard } from '../components/cards/ResourceMetricCard';
import { DashboardTelemetryVisualizer } from '../components/dashboard/DashboardTelemetryVisualizer';
import { LiveMonitoringPanel } from '../components/dashboard/LiveMonitoringPanel';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { AIRecommendationsPanel } from '../components/dashboard/AIRecommendationsPanel';
import { RecentActivityPanel } from '../components/dashboard/RecentActivityPanel';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Droplet,
  Zap,
  Leaf,
  ShieldCheck,
  BarChart3,
  Download,
  ShieldAlert,
  Database,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadCsv } from '../utils/exportUtils';
import { telemetryService } from '../services/telemetryService';
import { supabaseTelemetryService } from '../services/supabaseTelemetryService';

export const Dashboard: React.FC = () => {
  const {
    waterReading,
    electricityReading,
    user,
    showToast,
    telemetrySourceMode,
    setTelemetrySourceMode,
    isSupabaseReady,
    physicalLoading,
    physicalError,
    hasPhysicalData,
    refreshPhysicalTelemetry,
  } = useApp();
  const { reportingPeriod } = useTheme();

  const [timeRange, setTimeRange] = useState<'8h' | '24h' | '30d'>(() =>
    reportingPeriod === '30d' || reportingPeriod === '90d' ? '30d' : '24h'
  );
  const prevReportingPeriodRef = useRef(reportingPeriod);

  useEffect(() => {
    if (prevReportingPeriodRef.current === reportingPeriod) return;
    prevReportingPeriodRef.current = reportingPeriod;
    setTimeRange(reportingPeriod === '30d' || reportingPeriod === '90d' ? '30d' : '24h');
  }, [reportingPeriod]);

  const [isEmergencyValveTripped, setIsEmergencyValveTripped] = useState<boolean>(false);

  const isPhysical = telemetrySourceMode === 'physical';
  const metrics = isPhysical
    ? supabaseTelemetryService.getTimeRangeMetrics(timeRange, waterReading)
    : telemetryService.getTimeRangeMetrics(timeRange);

  const waterTarget = timeRange === '8h' ? 250 : timeRange === '30d' ? 11400 : 450;
  const powerTarget = timeRange === '8h' ? 15 : timeRange === '30d' ? 600 : 22;
  const waterSavedGoal = timeRange === '8h' ? 40 : timeRange === '30d' ? 1500 : 65;
  const powerSavedGoal = timeRange === '8h' ? 1.5 : timeRange === '30d' ? 45 : 2.5;

  const rigTooltip = isPhysical
    ? 'ESP32 Physical Hardware Rig · FS-S401 Water Flow & 16x2 LCD Active · INA219 DC Sensor Pending Test · Supabase Cloud DB'
    : 'ESP32 Testbench Lab · 6 Simulated Sensor Feeds · Wi-Fi & MQTT Stream (115200 Baud)';

  const handleToggleEmergencyValve = () => {
    const next = !isEmergencyValveTripped;
    setIsEmergencyValveTripped(next);
    if (next) {
      showToast(
        isPhysical
          ? '(Physical Console) Simulated emergency cutoff triggered on dashboard. Physical ESP32 valve actuator requires hardware relay integration.'
          : '(Frontend Demo) Simulated emergency valve cutoff triggered. Flow restricted to 0.00 L/min. Physical ESP32 actuator is unlinked.',
        'alert'
      );
    } else {
      showToast(
        '(Frontend Console) Valve reopened to normal passage envelope. Inflow resumed.',
        'success'
      );
    }
  };

  const handleExportQuickReport = () => {
    const headers = ['Metric', 'Current Value', 'Unit', 'Source Node', 'Transport', 'Status'];
    const rows = [
      ['Total Water Inflow', metrics.totalWater, metrics.totalWaterUnit, isPhysical ? 'esp32_w_01 (Physical)' : 'esp32_w_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'Physical (FS-S401)' : 'Simulated'],
      ['Instantaneous Flow Rate', waterReading.flowRateLpm != null ? waterReading.flowRateLpm : 0.0, 'L/min', isPhysical ? 'esp32_w_01 (Physical)' : 'esp32_w_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'Physical (FS-S401)' : 'Simulated'],
      ['Line Pressure', waterReading.pressurePsi != null ? waterReading.pressurePsi : 'N/A', 'PSI', isPhysical ? 'esp32_w_01 (Physical)' : 'esp32_w_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'Physical' : 'Simulated'],
      ['Total Power Draw', isPhysical ? (metrics.totalPower != null ? metrics.totalPower : 'Untested') : metrics.totalPower, isPhysical ? 'kWh (INA219 Untested)' : metrics.totalPowerUnit, isPhysical ? 'esp32_e_01 (Physical)' : 'esp32_e_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'INA219 Untested (Null)' : 'Simulated'],
      ['Active Load', electricityReading.activePowerKw != null ? electricityReading.activePowerKw : 'Untested', 'kW', isPhysical ? 'esp32_e_01 (Physical)' : 'esp32_e_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'INA219 Untested (Null)' : 'Simulated'],
      ['Grid Voltage', electricityReading.voltageVolts != null ? electricityReading.voltageVolts : 'Untested', 'V', isPhysical ? 'esp32_e_01 (Physical)' : 'esp32_e_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'INA219 Untested (Null)' : 'Simulated'],
      ['Power Factor', electricityReading.powerFactor != null ? electricityReading.powerFactor : 'Untested', 'Ratio', isPhysical ? 'esp32_e_01 (Physical)' : 'esp32_e_01', isPhysical ? 'Supabase Postgres' : 'Wi-Fi / MQTT', isPhysical ? 'INA219 Untested (Null)' : 'Simulated'],
      ['Emergency Valve State', isEmergencyValveTripped ? 'Tripped (Isolated)' : 'Open', 'State', 'esp32_w_02', isPhysical ? 'Physical Relay' : 'Simulated Relay', isPhysical ? 'Physical Console' : 'Demo Only'],
    ];

    downloadCsv(`aquawatt-telemetry-${telemetrySourceMode}-summary.csv`, headers, rows);
    showToast(`Downloaded aquawatt-telemetry-${telemetrySourceMode}-summary.csv`, 'success');
  };

  return (
    <AppLayout title="Facility Resource Console">
      <div className="space-y-5">
        {/* TOP HEADER & TOOLBAR */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-3 gap-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isPhysical ? 'Supabase synced' : 'Telemetry synced'}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-500 dark:text-slate-400">ESP32-NODE-01</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {isPhysical ? 'Physical' : 'Demo'}
              </span>
              <span title={rigTooltip} className="text-slate-400 hover:text-slate-600 cursor-help">
                <Info className="w-3.5 h-3.5" />
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight mt-1 truncate">
              {user?.facilityName || 'AquaWatt Facility Console'}
            </h2>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
            {/* Source Switcher */}
            <div
              role="group"
              aria-label="Telemetry Data Source"
              className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono border border-slate-200/60 dark:border-slate-700/60 shrink-0"
            >
              <button
                type="button"
                aria-pressed={!isPhysical}
                onClick={() => setTelemetrySourceMode('demo')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  !isPhysical
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                <span>Demo</span>
              </button>
              <button
                type="button"
                aria-pressed={isPhysical}
                onClick={() => setTelemetrySourceMode('physical')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isPhysical
                    ? 'bg-[#174A8B] text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Physical</span>
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div
              role="group"
              aria-label="Dashboard Timeframe"
              className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono shrink-0"
            >
              {[
                { id: '8h', label: '8h' },
                { id: '24h', label: '24h' },
                { id: '30d', label: '30d' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={timeRange === tab.id}
                  onClick={() => {
                    setTimeRange(tab.id as '8h' | '24h' | '30d');
                    showToast(`Timeframe set to ${tab.label}`, 'info');
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    timeRange === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Emergency Valve Shutoff */}
            <button
              type="button"
              aria-pressed={isEmergencyValveTripped}
              onClick={handleToggleEmergencyValve}
              title={
                isPhysical
                  ? 'Physical Console: Dispatches simulated cutoff signal.'
                  : 'Frontend Demonstration: Simulates closing the inflow valve. Physical ESP32 actuator is unlinked.'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer border whitespace-nowrap ${
                isEmergencyValveTripped
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white dark:bg-[#121B2B] hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${isEmergencyValveTripped ? 'text-white' : 'text-rose-500'}`} />
              <span>{isEmergencyValveTripped ? 'Valve Tripped' : 'Valve Cutoff'}</span>
            </button>

            <button
              type="button"
              aria-label="Export telemetry summary CSV"
              onClick={handleExportQuickReport}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#121B2B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white text-xs font-medium transition-colors shadow-xs whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>
          </div>
        </div>

        {/* PHYSICAL HARDWARE / SUPABASE STATUS BANNERS (Empty / Config / Loading States) */}
        {isPhysical && (
          <div className="space-y-3">
            {(!isSupabaseReady || physicalError) && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs font-mono text-amber-900 dark:text-amber-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm font-sans text-amber-950 dark:text-amber-100">
                        {isSupabaseReady ? 'Supabase Connection Notice' : 'Supabase Project Configuration Pending'}
                      </div>
                      <p className="mt-1 text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                        {physicalError ? (
                          <span className="font-medium text-amber-900 dark:text-amber-200">{physicalError}</span>
                        ) : (
                          <>
                            Add credentials to <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">.env.local</code> and execute <code className="font-mono">/supabase/schema.sql</code>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTelemetrySourceMode('demo')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-sans font-medium transition-colors cursor-pointer"
                    >
                      Return to Demo
                    </button>
                    {isSupabaseReady && (
                      <button
                        type="button"
                        onClick={refreshPhysicalTelemetry}
                        disabled={physicalLoading}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${physicalLoading ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isSupabaseReady && !physicalError && !hasPhysicalData && !physicalLoading && (
              <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 p-4 text-xs font-mono text-sky-950 dark:text-sky-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Database className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm font-sans text-sky-950 dark:text-sky-100 flex items-center gap-2">
                        <span>Connected to Supabase</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-300 font-mono">
                          Awaiting Ingestion
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                        No records received yet from ESP32 testbench (FS-S401 active, INA219 pending test).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={refreshPhysicalTelemetry}
                      disabled={physicalLoading}
                      className="px-3 py-1.5 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${physicalLoading ? 'animate-spin' : ''}`} />
                      <span>Check Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetrySourceMode('demo')}
                      className="px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-900 dark:text-sky-200 text-xs font-sans font-medium transition-colors cursor-pointer"
                    >
                      View Demo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {physicalLoading && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121B2B] p-3 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#174A8B] dark:text-sky-400" />
                <span>Polling Supabase sensor_readings...</span>
              </div>
            )}
          </div>
        )}

        {/* 4 DISTINCT COLOR-CODED KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Water Inflow"
            accentVariant="blue"
            value={metrics.totalWater.toLocaleString()}
            unit="L"
            comparisonText={isPhysical ? 'FS-S401' : 'vs baseline'}
            percentChange={isPhysical ? null : 14.2}
            isIncrease={false}
            isPositiveOutcome={true}
            icon={Droplet}
            hideSparkline={isPhysical && !hasPhysicalData}
            infoTooltip={
              isPhysical
                ? 'Total water inflow recorded by physical FS-S401 turbine sensor'
                : 'Total water volume across selected monitoring window compared against pre-sensor baseline'
            }
            sparklineData={timeRange === '8h' ? [32, 34, 30, 28, 26] : [38, 35, 32, 34, 30, 28, 26]}
            goal={{
              current: metrics.totalWater,
              target: waterTarget,
              unit: 'L',
              targetLabel: `Budget ${waterTarget.toLocaleString()} L`,
              accent: 'water',
            }}
            secondaryMetric={{
              label: isPhysical ? 'Sensor' : 'Peak rate',
              value: isPhysical ? 'FS-S401' : '4.80 L/min',
            }}
          />

          <KpiCard
            title="Power Draw"
            accentVariant="amber"
            value={metrics.totalPower != null ? metrics.totalPower.toFixed(1) : '—'}
            unit="kWh"
            comparisonText={isPhysical && metrics.totalPower == null ? 'INA219 pending' : 'vs baseline'}
            percentChange={isPhysical && metrics.totalPower == null ? null : 8.6}
            isIncrease={false}
            isPositiveOutcome={true}
            icon={Zap}
            hideSparkline={isPhysical && metrics.totalPower == null}
            infoTooltip={
              isPhysical
                ? 'Electrical draw from INA219 DC monitor (null until physical calibration completes)'
                : 'Total electrical consumption in selected window vs historical facility baseline'
            }
            sparklineData={timeRange === '8h' ? [19, 18, 19, 17] : [22, 20, 21, 19, 18, 19, 17]}
            goal={{
              current: metrics.totalPower,
              target: powerTarget,
              unit: 'kWh',
              targetLabel: `Cap ${powerTarget} kWh`,
              accent: 'power',
            }}
            secondaryMetric={{
              label: isPhysical ? 'INA219' : 'Power factor',
              value: isPhysical
                ? 'Calibration pending'
                : electricityReading.powerFactor != null
                  ? `${electricityReading.powerFactor}`
                  : '—',
            }}
          />

          <KpiCard
            title="Water Saved"
            accentVariant="emerald"
            value={isPhysical ? '—' : metrics.waterSaved.toLocaleString()}
            unit="L"
            comparisonText={isPhysical ? 'Awaiting baseline' : 'vs target'}
            percentChange={isPhysical ? null : 18.4}
            isIncrease={true}
            isPositiveOutcome={true}
            isHighlightedGreen={true}
            icon={Leaf}
            hideSparkline={isPhysical}
            infoTooltip="Cumulative water reduction relative to pre-installation baseline"
            sparklineData={[10, 14, 16, 20, 22, 25, 28]}
            goal={{
              current: isPhysical ? null : metrics.waterSaved,
              target: waterSavedGoal,
              unit: 'L',
              targetLabel: `Goal ${waterSavedGoal.toLocaleString()} L`,
              accent: 'eco',
            }}
            secondaryMetric={{
              label: 'Saved bill',
              value: isPhysical ? '—' : `₹${metrics.waterSavedCostInr.toFixed(2)}`,
            }}
          />

          <KpiCard
            title="Energy Saved"
            accentVariant="violet"
            value={
              isPhysical && metrics.energySaved == null
                ? '—'
                : metrics.energySaved != null
                ? metrics.energySaved.toFixed(1)
                : '51.2'
            }
            unit="kWh"
            comparisonText={isPhysical && metrics.energySaved == null ? 'INA219 untested' : 'vs target'}
            percentChange={isPhysical && metrics.energySaved == null ? null : 12.1}
            isIncrease={true}
            isPositiveOutcome={true}
            icon={ShieldCheck}
            hideSparkline={isPhysical && metrics.energySaved == null}
            infoTooltip="Energy conserved and estimated CO₂ avoided over the active window"
            sparklineData={[4, 6, 8, 9, 10, 11, 12]}
            goal={{
              current: isPhysical ? metrics.energySaved : (metrics.energySaved ?? 51.2),
              target: powerSavedGoal,
              unit: 'kWh',
              targetLabel: `Goal ${powerSavedGoal} kWh`,
              accent: 'eco',
            }}
            secondaryMetric={{
              label: 'CO₂ cut',
              value:
                isPhysical && metrics.carbonAvoidedKg == null
                  ? '— kg'
                  : `${metrics.carbonAvoidedKg != null ? metrics.carbonAvoidedKg.toFixed(1) : '19.7'} kg`,
            }}
          />
        </div>

        {/* LIVE STREAM METERS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ResourceMetricCard
            type="water"
            waterData={
              isEmergencyValveTripped
                ? {
                    ...waterReading,
                    flowRateLpm: 0.0,
                    pressurePsi: waterReading.pressurePsi != null ? 0.0 : null,
                  }
                : waterReading
            }
          />
          <ResourceMetricCard
            type="electricity"
            electricityData={electricityReading}
          />
        </div>

        {/* WHAT NEEDS ATTENTION & ONE-CLICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AlertsPanel />
          <AIRecommendationsPanel />
        </div>

        {/* CLOSER LOOK: DIURNAL TELEMETRY */}
        <DashboardTelemetryVisualizer timeRange={timeRange} />

        {/* SENSOR NETWORK MATRIX / BENTO */}
        <LiveMonitoringPanel />

        {/* EVENT LEDGER */}
        <RecentActivityPanel />
      </div>
    </AppLayout>
  );
};
