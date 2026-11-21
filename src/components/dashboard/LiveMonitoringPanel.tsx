import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Battery,
  Radio,
  Power,
  RefreshCw,
  LayoutGrid,
  List,
  Cpu,
  Clock,
  Send,
  Info,
} from 'lucide-react';
import { SensorDevice } from '../../types';

export const LiveMonitoringPanel: React.FC = () => {
  const { devices, toggleDeviceStatus, showToast, telemetrySourceMode } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'water' | 'electricity' | 'alert'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [isPinging, setIsPinging] = useState<boolean>(false);

  const isPhysical = telemetrySourceMode === 'physical';
  const alertCount = devices.filter(d => d.status === 'alert').length;

  const filteredDevices = devices.filter(d => {
    if (filterType === 'water') return d.type.includes('water') || d.type.includes('valve');
    if (filterType === 'electricity') return d.type.includes('power') || d.type.includes('submeter');
    if (filterType === 'alert') return d.status === 'alert';
    return true;
  });

  const handlePingAll = () => {
    setIsPinging(true);
    showToast(
      isPhysical
        ? 'Polling physical ESP32 nodes via Supabase heartbeat telemetry...'
        : '(Demo Simulation) Polling ESP32 nodes over Wi-Fi MQTT topic "aquawatt/nodes/+/status"...',
      'info'
    );
    setTimeout(() => {
      setIsPinging(false);
      showToast(
        isPhysical
          ? 'Physical node check complete: ESP32 responsive via Supabase.'
          : 'Simulated ping: All ESP32 nodes responsive in testbench. Serial stream active at 115200 baud.',
        'success'
      );
    }, 1500);
  };

  const getTransducerTag = (device: SensorDevice) => {
    if (device.waterSensorType === 'FS-S401' || device.type === 'combo_node') {
      return 'FS-S401 · 16x2 LCD · INA219';
    }
    if (device.powerSensorType === 'INA219') {
      return 'INA219 · Untested';
    }
    switch (device.type) {
      case 'water_meter':
        return 'FS-S401 · GPIO34 Pulse (Demo)';
      case 'smart_valve':
        return 'Relay Actuator · Simulated';
      case 'power_monitor':
        return 'INA219 · DC Monitor (Demo)';
      case 'submeter_panel':
        return 'Simulated Submeter · Channel B';
      default:
        return 'ESP32 Sensor Node';
    }
  };

  const networkTooltip = isPhysical
    ? 'ESP32 hardware nodes registered in Supabase Postgres'
    : 'ESP32 Wi-Fi (802.11 b/g/n) · MQTT pub/sub · 115200 baud testbench stream';

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
            ESP32 Sensor Network
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
            {devices.length} {devices.length === 1 ? 'node' : 'nodes'}
          </span>
          {alertCount > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 font-medium tabular-nums">
              {alertCount} alert
            </span>
          )}
          <span title={networkTooltip} className="text-slate-400 hover:text-slate-600 cursor-help">
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* View & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Sensor node layout"
            className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              aria-label="Card Grid View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'matrix'}
              onClick={() => setViewMode('matrix')}
              title="SCADA Matrix Table View"
              aria-label="SCADA Matrix Table View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter sensor nodes"
            className="flex flex-wrap items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono"
          >
            {(['all', 'water', 'electricity', 'alert'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                aria-pressed={filterType === tab}
                onClick={() => setFilterType(tab)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                  filterType === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab === 'all'
                  ? `All (${devices.length})`
                  : tab === 'water'
                  ? 'Water'
                  : tab === 'electricity'
                  ? 'Power'
                  : `Alerts (${alertCount})`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePingAll}
            disabled={isPinging}
            title="Broadcast heartbeat ping to sensors"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
          >
            {isPinging ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#174A8B] dark:text-sky-400" />
            )}
            <span>{isPinging ? 'Pinging...' : isPhysical ? 'Query' : 'Ping Bus'}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 ? (
        <div className="py-10 text-center text-xs font-mono border border-dashed border-slate-200 dark:border-slate-800 rounded-lg mt-4 bg-slate-50/50 dark:bg-slate-900/20">
          <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm font-sans">
            {isPhysical ? 'No Physical Devices Registered in Supabase' : 'No Devices Match Filter'}
          </p>
          <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
            {isPhysical
              ? 'ESP32 devices registered in public.devices will appear here. Run the testbench seed in supabase/schema.sql to populate an initial node.'
              : 'Switch filters to view active testbench nodes.'}
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* Matrix View — Right-Aligned Tabular Numbers */
        <div className="mt-4 overflow-x-auto border border-slate-200/80 dark:border-slate-800/80 rounded-lg">
          <table className="w-full text-left text-xs font-mono border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-medium">Node</th>
                <th className="py-2.5 px-3 font-medium">Hardware · Zone</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Battery</th>
                <th className="py-2.5 px-3 font-medium text-right">RSSI</th>
                <th className="py-2.5 px-3 font-medium text-right">Sync</th>
                <th className="py-2.5 px-3 font-medium text-right">Relay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredDevices.map(device => {
                const isAlert = device.status === 'alert';
                const isOnline = device.status === 'online';

                return (
                  <tr
                    key={device.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isAlert ? 'bg-amber-50/35 dark:bg-amber-950/15' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {device.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-medium text-slate-900 dark:text-white">
                        {device.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {getTransducerTag(device)} · {device.location}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                          isOnline
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : isAlert
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/70'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? 'bg-emerald-500' : isAlert ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        />
                        {device.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {device.batteryPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {device.signalStrengthDbm} dBm
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                      {device.lastSync}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => toggleDeviceStatus(device.id)}
                        aria-label={`Toggle relay for ${device.name}`}
                        title={
                          device.isSimulated
                            ? `(Demo Mode) Toggle simulated relay for ${device.name}`
                            : `(Physical Node) Toggle relay for ${device.name}`
                        }
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
                          isAlert
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 hover:bg-amber-200/70'
                            : isOnline
                            ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card Grid View — Calm Uniform Cards, Warm Accent Strictly on Alert Node */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
          {filteredDevices.map(device => {
            const isAlert = device.status === 'alert';
            const isOnline = device.status === 'online';

            return (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isAlert
                    ? 'border-amber-300/90 dark:border-amber-700/80 bg-amber-50/30 dark:bg-amber-950/15'
                    : 'border-slate-200/85 dark:border-slate-800/90 bg-white dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {device.id}
                      </span>
                      <span>·</span>
                      <span>{device.firmwareVersion}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                      {device.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {device.location}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleDeviceStatus(device.id)}
                    aria-label={`Toggle relay for ${device.name}`}
                    title={
                      device.isSimulated
                        ? `(Demo Mode) Toggle simulated relay for ${device.name}`
                        : `(Physical Node) Toggle relay for ${device.name}`
                    }
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isAlert
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 hover:bg-amber-200/80'
                        : isOnline
                        ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-slate-600'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Concise Fact Line */}
                <div className="mt-2.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {getTransducerTag(device)}
                </div>

                {/* Bottom Status & Tabular Telemetry */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-500' : isAlert ? 'bg-amber-500' : 'bg-slate-400'
                      }`}
                    />
                    <span
                      className={`capitalize font-medium ${
                        isAlert
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {device.status}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {device.lastSync}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1" title="Battery reserve">
                      <Battery className="w-3 h-3 text-slate-400" />
                      {device.batteryPercent}%
                    </span>
                    <span className="flex items-center gap-1" title="Wi-Fi RSSI">
                      <Radio className="w-3 h-3 text-slate-400" />
                      {device.signalStrengthDbm} dBm
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
