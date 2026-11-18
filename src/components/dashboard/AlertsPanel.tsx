import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Check,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { summarizeActiveAlerts } from '../../utils/dashboardMetrics';

export const AlertsPanel: React.FC = () => {
  const { alerts, resolveAlert, showToast, telemetrySourceMode } = useApp();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const isPhysical = telemetrySourceMode === 'physical';

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'active') return !alert.isResolved;
    if (filterSeverity === 'critical') return alert.severity === 'critical';
    if (filterSeverity === 'warning') return alert.severity === 'warning';
    return true;
  });

  const activeAlerts = alerts.filter(a => !a.isResolved);
  const criticalCount = alerts.filter(a => !a.isResolved && a.severity === 'critical').length;
  const summary = summarizeActiveAlerts(alerts, isPhysical);

  const handleIsolateValve = (alertTitle: string) => {
    showToast(
      `(Frontend Demo) Simulated valve shutoff command logged for "${alertTitle}". Physical ESP32 actuator is unlinked.`,
      'info'
    );
  };

  return (
    <div className="rounded-xl bg-white dark:bg-[#121B2B] border border-slate-200/85 dark:border-slate-800/90 p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/70 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight">
            Incident Triage
          </h3>
          {criticalCount > 0 ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 font-medium tabular-nums">
              {criticalCount} critical
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              Nominal
            </span>
          )}
          <span
            title="Threshold anomaly detection across ESP32 flow pulses and CT current channels"
            className="text-slate-400 hover:text-slate-600 cursor-help"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Severity Filters */}
        <div
          role="group"
          aria-label="Filter incidents by severity"
          className="flex flex-wrap items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-mono self-start sm:self-auto"
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: `Active (${activeAlerts.length})` },
            { id: 'critical', label: 'Critical' },
            { id: 'warning', label: 'Warning' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filterSeverity === tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterSeverity === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="mt-3.5 p-3 rounded-lg bg-slate-50/75 dark:bg-slate-800/35 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
        <div>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">
            Open
          </span>
          <span className="font-semibold text-slate-900 dark:text-white text-sm">
            {summary.openCount}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">
            Est. loss
          </span>
          <span
            className={`font-semibold text-sm ${
              summary.hasWaterLoss
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {summary.estimatedLossLabel}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">
            Exposure
          </span>
          <span
            className={`font-semibold text-sm ${
              summary.hasExposure
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {summary.exposureInrLabel}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">
            Mean MTTR
          </span>
          <span className="font-semibold text-slate-900 dark:text-white text-sm">
            {summary.mttrLabel}
          </span>
        </div>
      </div>

      {/* Wordless Alert Feed: Metric Facts + Inline Action Beside Data */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/70 mt-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
            <CheckCircle2 className="w-7 h-7 text-[#237A57] mx-auto mb-2 opacity-70" />
            <p className="font-sans">No active incidents match filter.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';
            const isWater = alert.resource === 'water';

            const detailTooltip = [alert.description, alert.actionRequired]
              .filter(Boolean)
              .join(' — ');

            const compactLocation = alert.location.split(' · ')[0];
            const factParts = [
              compactLocation,
              alert.estimatedWastage,
              alert.potentialCostImpact ? `~₹${alert.potentialCostImpact}/mo` : null,
            ].filter(Boolean);

            return (
              <div
                key={alert.id}
                title={detailTooltip}
                className={`py-3 px-2.5 sm:px-3 transition-colors rounded-lg ${
                  !alert.isResolved && isCritical
                    ? 'bg-rose-50/45 dark:bg-rose-950/20'
                    : !alert.isResolved && isWarning
                    ? 'bg-amber-50/45 dark:bg-amber-950/20'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 border ${
                        alert.isResolved
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          : isCritical
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200/80 dark:border-rose-800/80'
                          : isWarning
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200/80 dark:border-amber-800/80'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {alert.isResolved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isCritical ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {alert.title}
                        </h4>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium capitalize shrink-0 ${
                            alert.isResolved
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              : isCritical
                              ? 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : isWarning
                              ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {alert.isResolved ? 'resolved' : alert.severity}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                          {alert.timestamp}
                        </span>
                        {detailTooltip && (
                          <span
                            title={detailTooltip}
                            className="text-slate-400 hover:text-slate-600 cursor-help shrink-0"
                          >
                            <Info className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {factParts.join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Beside Data */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-9 sm:pl-0">
                    {!alert.isResolved ? (
                      <>
                        {isCritical && isWater && (
                          <button
                            onClick={() => handleIsolateValve(alert.title)}
                            title="Frontend Demonstration: Simulates shutting off the line valve. Physical ESP32 actuator is unlinked."
                            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Trip Valve</span>
                          </button>
                        )}
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-2.5 py-1 rounded-md bg-[#237A57] hover:bg-[#1C6347] text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 font-mono"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#237A57] dark:text-emerald-400" />
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
