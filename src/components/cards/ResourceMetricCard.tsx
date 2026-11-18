import React, { useState } from 'react';
import {
  Droplet,
  Zap,
  Gauge,
  Activity,
  ArrowDownRight,
  Thermometer,
  ShieldAlert,
  Sliders,
  Info,
} from 'lucide-react';
import { WaterReading, ElectricityReading } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatSensorNumber } from '../../utils/dashboardMetrics';

interface ResourceMetricCardProps {
  type: 'water' | 'electricity';
  waterData?: WaterReading;
  electricityData?: ElectricityReading;
}

export const ResourceMetricCard: React.FC<ResourceMetricCardProps> = ({
  type,
  waterData,
  electricityData,
}) => {
  const isWater = type === 'water';
  const { showToast } = useApp();

  const [valveState, setValveState] = useState<'open' | 'testing' | 'isolated'>('open');
  const [sensitivity, setSensitivity] = useState<'high' | 'standard'>('high');
  const [loadShiftActive, setLoadShiftActive] = useState<boolean>(false);

  const isPhysical = isWater ? waterData?.isPhysical : electricityData?.isPhysical;
  const isPowerUntested = !isWater && electricityData?.activePowerKw == null;

  const hardwareTooltip = isWater
    ? isPhysical
      ? 'FS-S401 turbine flow sensor with 16x2 LCD physical telemetry via Supabase'
      : 'YF-S201 pulse flow sensor stream simulated via ESP32 GPIO interrupt'
    : isPhysical
    ? electricityData?.statusNote || 'INA219 DC current/voltage sensor pending bench calibration'
    : 'SCT-013 split-core CT sensor simulated at 115200 baud';

  const handleTestValve = () => {
    if (valveState === 'open') {
      setValveState('testing');
      showToast('Initiating simulated 3-second motor pulse sequence (Demo Mode)...', 'info');
      setTimeout(() => {
        setValveState('open');
        showToast('(Frontend Demo) Simulated valve pulse verified. Physical ESP32 actuator is unlinked.', 'success');
      }, 3000);
    }
  };

  const handleToggleLoadShift = () => {
    const next = !loadShiftActive;
    setLoadShiftActive(next);
    showToast(
      next
        ? '(Frontend Demo) Simulated TOU Peak Shift engaged: Lower tariff slab simulated'
        : '(Frontend Demo) TOU Peak Shift disengaged: Standard tariff tracking active',
      'info'
    );
  };

  const flowPct = Math.min(100, Math.max(4, ((waterData?.flowRateLpm ?? 0) / 8.0) * 100));

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header Strip */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            {isWater ? (
              <Droplet className="w-4 h-4 text-[#174A8B] dark:text-sky-400" />
            ) : (
              <Zap className="w-4 h-4 text-[#237A57] dark:text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
                {isWater ? 'Water Flow' : 'Electrical Load'}
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {isWater ? 'esp32_w_01' : 'esp32_e_01'}
              </span>
              <span
                title={hardwareTooltip}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
              >
                <Info className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Calm Status Indicator */}
        {isPowerUntested ? (
          <span
            title={hardwareTooltip}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-[11px] font-mono font-medium text-amber-700 dark:text-amber-300 shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Test
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isPhysical ? 'Live DB' : 'Streaming'}
          </span>
        )}
      </div>

      {/* Primary Readout + Baseline */}
      <div className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {isWater ? 'Instantaneous flow' : 'Active demand'}
            </span>
            <div className="mt-1 flex items-baseline gap-2 tabular-nums">
              <span className="text-3xl sm:text-4xl font-semibold font-mono tracking-tight text-slate-900 dark:text-white">
                {isWater
                  ? formatSensorNumber(waterData?.flowRateLpm ?? 0, 2)
                  : formatSensorNumber(electricityData?.activePowerKw, 2)}
              </span>
              <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
                {isWater ? 'L/min' : 'kW'}
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            {isPowerUntested ? (
              <span className="inline-flex items-center text-[11px] font-mono font-medium text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                INA219 uncalibrated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#237A57] dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-0.5 rounded tabular-nums">
                <ArrowDownRight className="w-3 h-3" />
                {isWater ? '−14.2%' : '−8.6%'} vs avg
              </span>
            )}
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
              {isWater ? 'Avg 3.73 L/min' : isPowerUntested ? 'No data' : 'Avg 2.01 kW'}
            </p>
          </div>
        </div>

        {/* Bullet / Distribution Track */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5 tabular-nums">
            <span>
              {isWater
                ? 'Cap 8.0 L/min'
                : isPowerUntested
                ? 'INA219 DC bus'
                : 'L1 34% · L2 33% · L3 33%'}
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {isWater
                ? waterData?.pressurePsi != null
                  ? `${waterData.pressurePsi} PSI`
                  : 'Turbine active'
                : isPowerUntested
                ? '—'
                : '3-Phase balanced'}
            </span>
          </div>

          {isWater ? (
            <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible">
              <div
                className="h-full bg-[#174A8B] dark:bg-sky-400 transition-all duration-500 rounded-full"
                style={{ width: `${flowPct}%` }}
              />
              <span
                className="absolute -top-0.5 h-2.5 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
                style={{ left: '75%' }}
                title="Nominal alert threshold (6.0 L/min)"
              />
            </div>
          ) : isPowerUntested ? (
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden" />
          ) : (
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-[#174A8B] w-[34%]" title="Phase A: 34%" />
              <div className="h-full bg-[#237A57] w-[33%]" title="Phase B: 33%" />
              <div className="h-full bg-slate-400 dark:bg-slate-500 w-[33%]" title="Phase C: 33%" />
            </div>
          )}
        </div>
      </div>

      {/* Sub-metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/70 tabular-nums">
        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/35">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Today
          </span>
          <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {isWater
              ? `${waterData?.dailyTotalLiters ?? 0} L`
              : electricityData?.dailyTotalKwh != null
              ? `${electricityData.dailyTotalKwh} kWh`
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {isWater
              ? `${waterData?.currentUsageGallons ?? 0} gal`
              : isPowerUntested
              ? 'Untested'
              : '18.6 avg'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/35">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Month
          </span>
          <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {isWater
              ? `${(waterData?.monthlyTotalLiters ?? 0).toLocaleString()} L`
              : electricityData?.monthlyTotalKwh != null
              ? `${electricityData.monthlyTotalKwh.toLocaleString()} kWh`
              : '—'}
          </span>
          <span
            className={`text-[10px] font-mono ${
              isPowerUntested ? 'text-slate-400' : 'text-[#237A57] dark:text-emerald-400'
            }`}
          >
            {isPowerUntested ? 'Untested' : '−12.4% MoM'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/35">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-slate-400" />
            {isWater ? 'Pressure' : 'Voltage'}
          </span>
          <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {isWater
              ? waterData?.pressurePsi != null
                ? `${waterData.pressurePsi} PSI`
                : '—'
              : electricityData?.voltageVolts != null
              ? `${electricityData.voltageVolts} V`
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {isWater
              ? waterData?.pressurePsi != null
                ? '±1.2%'
                : 'No sensor'
              : isPowerUntested
              ? 'Untested'
              : '±1.2%'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/35">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {isWater ? (
              <Thermometer className="w-3 h-3 text-slate-400" />
            ) : (
              <Activity className="w-3 h-3 text-slate-400" />
            )}
            {isWater ? 'Temp' : 'Power Factor'}
          </span>
          <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {isWater
              ? waterData?.temperatureC != null
                ? `${waterData.temperatureC} °C`
                : '—'
              : electricityData?.powerFactor != null
              ? `${electricityData.powerFactor}`
              : '—'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {isWater
              ? waterData?.temperatureC != null
                ? 'Ambient'
                : 'No sensor'
              : electricityData?.frequencyHz != null
              ? `${electricityData.frequencyHz} Hz`
              : 'Untested'}
          </span>
        </div>
      </div>

      {/* Interactive Micro-Controls Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        {isWater ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Threshold</span>
              <button
                onClick={() => {
                  const next = sensitivity === 'high' ? 'standard' : 'high';
                  setSensitivity(next);
                  showToast(
                    `Flow threshold set to ${next === 'high' ? '±0.10 L/min' : '±0.50 L/min'} (Simulated)`,
                    'info'
                  );
                }}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {sensitivity === 'high' ? '±0.10 L/m' : '±0.50 L/m'}
              </button>
            </div>

            <button
              onClick={handleTestValve}
              disabled={valveState === 'testing'}
              title="Frontend Demonstration: Simulates sending a valve pulse signal. Physical ESP32 actuator is unlinked."
              className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
              <span>{valveState === 'testing' ? 'Testing...' : 'Valve Pulse'}</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">THD</span>
              <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                {isPowerUntested ? 'Untested' : '1.4%'}
              </span>
            </div>

            <button
              onClick={handleToggleLoadShift}
              title="Frontend Demonstration: Simulates shifting peak loads to off-peak TOU tariff hours."
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
                loadShiftActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />
              <span>{loadShiftActive ? 'TOU Active (−18%)' : 'TOU Shift'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
