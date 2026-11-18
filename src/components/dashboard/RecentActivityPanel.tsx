import React, { useState } from 'react';
import {
  Clock,
  Droplet,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { downloadCsv } from '../../utils/exportUtils';

interface ActivityEvent {
  id: string;
  type: 'water' | 'electricity' | 'system' | 'alert';
  title: string;
  fact: string;
  detail: string;
  time: string;
  nodeId: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
}

const EVENTS: ActivityEvent[] = [
  {
    id: 'ev_01',
    type: 'water',
    title: 'Irrigation Zone B Cycle Completed',
    fact: '124 L · 930 pulses',
    detail: 'Volume: 124 L • Pulse count: 930 pulses (YF-S201 calibrated K-factor)',
    time: '04:45:20 AM',
    nodeId: 'esp32_w_02',
    severity: 'success',
  },
  {
    id: 'ev_02',
    type: 'alert',
    title: 'Nocturnal Flow Warning Logged',
    fact: '1.4 L/min · 02:30–04:30',
    detail: 'Push alert logged • Flow rate: 1.4 L/min persistent (threshold triggered)',
    time: '02:30:15 AM',
    nodeId: 'esp32_w_02',
    severity: 'critical',
  },
  {
    id: 'ev_03',
    type: 'electricity',
    title: 'Heat Pump Chiller Shifted to Off-Peak',
    fact: '2.8 kW → 0.9 kW · +₹12.50',
    detail: 'Active draw shifted from 2.8 kW to 0.9 kW • Saved ~₹12.50 in peak rates',
    time: '11:00:00 PM',
    nodeId: 'esp32_e_02',
    severity: 'info',
  },
  {
    id: 'ev_04',
    type: 'system',
    title: 'ESP32 Pulse Interrupt Verified',
    fact: '0.00 L/min baseline · Serial',
    detail: 'Flow meter zero-pulse baseline verified at 0.00 L/min via Serial',
    time: '06:15:33 PM',
    nodeId: 'esp32_w_01',
    severity: 'success',
  },
  {
    id: 'ev_05',
    type: 'water',
    title: 'Mains Pressure Surge Logged',
    fact: '61 PSI peak',
    detail: 'Pressure peaked at 61 PSI during municipal distribution balance testing',
    time: '05:15:10 PM',
    nodeId: 'esp32_w_01',
    severity: 'warning',
  },
  {
    id: 'ev_06',
    type: 'system',
    title: 'Daily Telemetry Digest Compiled',
    fact: '72 L · 4.2 kWh saved',
    detail: 'Simulated 72 L water and 4.2 kWh electricity saved vs baseline',
    time: 'Nov 03, 23:59',
    nodeId: 'ESP32-NODE-01',
    severity: 'success',
  },
];

export const RecentActivityPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'water' | 'electricity' | 'system'>('all');
  const { showToast, telemetrySourceMode, hasPhysicalData, waterReading } = useApp();
  const isPhysical = telemetrySourceMode === 'physical';

  const sourceEvents: ActivityEvent[] = isPhysical
    ? hasPhysicalData
      ? [
          {
            id: 'phys_ev_01',
            type: 'water',
            title: 'FS-S401 Pulse Flow Reading Synced',
            fact: `${waterReading.flowRateLpm.toFixed(2)} L/min · ${waterReading.dailyTotalLiters.toFixed(1)} L today`,
            detail: `Physical Supabase row synced at ${waterReading.timestamp} (${waterReading.pulseCount ?? 0} pulses)`,
            time: waterReading.timestamp,
            nodeId: waterReading.deviceId || 'ESP32-NODE-01',
            severity: 'success',
          },
        ]
      : []
    : EVENTS;

  const filteredEvents = sourceEvents.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'water') return e.type === 'water';
    if (filter === 'electricity') return e.type === 'electricity';
    if (filter === 'system') return e.type === 'system' || e.type === 'alert';
    return true;
  });

  const handleExportAudit = () => {
    if (filteredEvents.length === 0) {
      showToast('No audit events recorded to export for the active mode.', 'warning');
      return;
    }
    const headers = ['Event ID', 'Domain', 'Node ID', 'Timestamp', 'Title', 'Telemetry Detail', 'Severity'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.type,
      e.nodeId,
      e.time,
      e.title,
      e.detail,
      e.severity || 'info',
    ]);
    const filename = `aquawatt-telemetry-audit-${telemetrySourceMode}.csv`;
    downloadCsv(filename, headers, rows);
    showToast(`Downloaded ${filename}`, 'success');
  };

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
            Audit Ledger
          </h3>
          <span
            title={
              isPhysical
                ? 'Event sequence synced from Supabase physical gateway rows [PHYSICAL]'
                : 'Event sequence timestamped by ESP32 Gateway Node [DEMO]'
            }
            className="text-slate-400 hover:text-slate-600 cursor-help"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter audit events"
            className="flex flex-wrap items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-mono"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'water', label: 'Water' },
              { id: 'electricity', label: 'Power' },
              { id: 'system', label: 'System' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <Download className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Compact Event Rows or Physical Empty State */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/70 mt-2">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-7 h-7 mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {isPhysical
                ? 'No physical gateway events ingested from Supabase yet.'
                : 'No audit events match the selected filter.'}
            </p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const iconConfig = {
              water: <Droplet className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />,
              electricity: <Zap className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />,
              alert: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
              system: <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />,
            };

            return (
              <div
                key={event.id}
                title={event.detail}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/25 px-2 rounded-lg transition-colors font-mono tabular-nums"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                    {iconConfig[event.type]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans font-medium text-slate-900 dark:text-white truncate">
                        {event.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {event.nodeId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {event.fact}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between text-slate-400 text-[11px] shrink-0 pl-8 sm:pl-0">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {event.time}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#237A57] dark:text-emerald-400" />
                    {isPhysical ? 'Ingested' : 'Verified'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
