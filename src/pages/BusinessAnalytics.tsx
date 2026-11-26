import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { BusinessDataSourceMode } from '../types/businessAnalytics';
import {
  buildBusinessAnalyticsDataset,
  fetchPhysicalBusinessSnapshot,
  PhysicalSupabaseSnapshot,
} from '../services/businessAnalyticsService';
import { formatCompactLiters, formatNumber } from '../utils/businessAnalyticsMath';
import {
  FolioBandNav,
  SectionDescriptor,
} from '../components/business-analytics/FolioBandNav';
import { FolioControlPanel } from '../components/business-analytics/FolioControlPanel';
import { FigureBlock } from '../components/business-analytics/FigureBlock';
import { UnitMatrixChart } from '../components/business-analytics/UnitMatrixChart';
import { DumbbellPeriodChart } from '../components/business-analytics/DumbbellPeriodChart';
import { RotatedKpiBars } from '../components/business-analytics/RotatedKpiBars';
import { TrendTimelineExplorer } from '../components/business-analytics/TrendTimelineExplorer';
import { ScrollyStackedColumns } from '../components/business-analytics/ScrollyStackedColumns';
import { PatternHeatmap } from '../components/business-analytics/PatternHeatmap';
import { DistributionWaffleAndBars } from '../components/business-analytics/DistributionWaffleAndBars';
import { ScatterRegressionChart } from '../components/business-analytics/ScatterRegressionChart';
import { BusinessDataExplorer } from '../components/business-analytics/BusinessDataExplorer';
import { RollingFacilityAccountSection } from '../components/business-analytics/RollingFacilityAccountSection';
import '../styles/business-analytics-folio.css';

const SECTIONS: ReadonlyArray<SectionDescriptor> = [
  { id: 's01', num: '01', title: 'Business Resource Overview' },
  { id: 's02', num: '02', title: 'Period Comparison' },
  { id: 's03', num: '03', title: 'Facility Breakdown' },
  { id: 's04', num: '04', title: 'Consumption Trends & Milestones' },
  { id: 's05', num: '05', title: 'Historical Consumption Report' },
  { id: 's06', num: '06', title: 'Consumption Pattern Heatmap' },
  { id: 's07', num: '07', title: 'Resource Distribution' },
  { id: 's08', num: '08', title: 'Usage Relationship Analysis' },
  { id: 's09', num: '09', title: 'Business Data Explorer' },
  { id: 's10', num: '10', title: 'Rolling Facility Account' },
];

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  meta: string;
}

export const BusinessAnalytics: React.FC = () => {
  const {
    theme,
    setTheme,
    palette,
    setPalette,
    reportingPeriod,
    setReportingPeriod,
    showGridOverlay,
    toggleGridOverlay,
  } = useTheme();
  const { telemetrySourceMode, setTelemetrySourceMode, showToast } = useApp();

  const [sourceMode, setSourceMode] = useState<BusinessDataSourceMode>(() =>
    telemetrySourceMode === 'physical' ? 'physical' : 'hybrid'
  );
  const prevTelemetrySourceRef = useRef(telemetrySourceMode);

  useEffect(() => {
    if (prevTelemetrySourceRef.current === telemetrySourceMode) return;
    prevTelemetrySourceRef.current = telemetrySourceMode;
    setSourceMode(telemetrySourceMode === 'physical' ? 'physical' : 'hybrid');
  }, [telemetrySourceMode]);

  const handleSourceModeChange = useCallback(
    (nextMode: BusinessDataSourceMode) => {
      setSourceMode(nextMode);
      if (nextMode === 'physical') {
        setTelemetrySourceMode('physical');
      } else if (nextMode === 'demo') {
        setTelemetrySourceMode('demo');
      }
    },
    [setTelemetrySourceMode]
  );

  const [controlsOpen, setControlsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSwappingTitle, setIsSwappingTitle] = useState(false);

  const [physicalSnapshot, setPhysicalSnapshot] = useState<PhysicalSupabaseSnapshot>({
    readings: [],
    devices: [],
    alerts: [],
    fetchedAtIso: new Date().toISOString(),
    error: null,
  });
  const [isLoadingPhysical, setIsLoadingPhysical] = useState(true);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    meta: '',
  });

  const mainRef = useRef<HTMLDivElement>(null);

  const loadPhysical = useCallback(async () => {
    setIsLoadingPhysical(true);
    const snap = await fetchPhysicalBusinessSnapshot();
    setPhysicalSnapshot(snap);
    setIsLoadingPhysical(false);
  }, []);

  useEffect(() => {
    void loadPhysical();
  }, [loadPhysical]);

  const dataset = useMemo(
    () =>
      buildBusinessAnalyticsDataset({
        sourceMode,
        reportingPeriod,
        physicalSnapshot,
      }),
    [sourceMode, reportingPeriod, physicalSnapshot]
  );

  const jumpToSection = useCallback((idx: number) => {
    const target = SECTIONS[idx];
    if (!target) return;
    const el = document.getElementById(target.id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 44;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  // Single Scroll rAF loop updating scroll progress & current visible section
  useEffect(() => {
    let rafId = 0;

    const updateOnScroll = () => {
      rafId = 0;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      setScrollProgress(progress);

      const midLine = window.innerHeight * 0.36;
      let nextIdx = 0;
      SECTIONS.forEach((sec, idx) => {
        const el = document.getElementById(sec.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= midLine) {
          nextIdx = idx;
        }
      });

      setActiveIndex(prev => {
        if (prev !== nextIdx) {
          setIsSwappingTitle(true);
          window.setTimeout(() => setIsSwappingTitle(false), 180);
        }
        return nextIdx;
      });
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(updateOnScroll);
      }
    };

    updateOnScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Editorial Keyboard Shortcuts (J/K, 1..9, G, Esc)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        jumpToSection(Math.min(SECTIONS.length - 1, activeIndex + 1));
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        jumpToSection(Math.max(0, activeIndex - 1));
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleGridOverlay();
      } else if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === '0' ? 9 : Number(e.key) - 1;
        if (idx >= 0 && idx < SECTIONS.length) {
          e.preventDefault();
          jumpToSection(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, jumpToSection, toggleGridOverlay]);

  const showTooltip = useCallback((x: number, y: number, title: string, meta: string) => {
    const clampedX = Math.max(16, Math.min(window.innerWidth - 275, x + 14));
    const clampedY = Math.max(54, Math.min(window.innerHeight - 90, y - 42));
    setTooltip({
      visible: true,
      x: clampedX,
      y: clampedY,
      title,
      meta,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  const provenanceTone =
    dataset.effectiveProvenance === 'physical'
      ? 'is-physical'
      : 'is-demo';

  const provenanceText =
    dataset.effectiveProvenance === 'physical'
      ? 'VERIFIED PHYSICAL TELEMETRY (FS-S401)'
      : dataset.effectiveProvenance === 'mixed'
      ? 'HYBRID AUDIT · PHYSICAL + DEMO FLEET'
      : 'DEMO DATASET · MULTI-ZONE ENTERPRISE MODEL';

  return (
    <div
      className="aw-folio-scope"
      data-aw-folio-palette={palette}
    >
      <a href="#s01" className="skip-link">
        Skip to executive overview
      </a>

      <FolioBandNav
        sections={SECTIONS}
        activeIndex={activeIndex}
        scrollProgress={scrollProgress}
        isSwappingTitle={isSwappingTitle}
        onJumpToSection={jumpToSection}
        onOpenControls={() => setControlsOpen(true)}
      />

      {showGridOverlay && (
        <div className="grid-overlay" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      )}

      <main ref={mainRef} className="main-scroll" aria-label="AquaWatt Business Analytics">
        {/* ================================================================
            01 · BUSINESS RESOURCE OVERVIEW
           ================================================================ */}
        <section id="s01" className="spread" data-spine="true" aria-labelledby="s01-heading">
          <div className="folio-line">
            <span>AQUAWATT // BUSINESS ANALYTICS EDITION</span>
            <span>SECTION 01 / 10 · OVERVIEW</span>
          </div>

          <div className="grid-12">
            <div className="span-6 space-y-5">
              <div className="kicker">
                <span>01 · EXECUTIVE RESOURCE OVERVIEW</span>
                <span className={`provenance-mark ${provenanceTone}`}>
                  <i aria-hidden="true" />
                  {provenanceText}
                </span>
              </div>

              <div className="title-mask">
                <h1 id="s01-heading" className="title">
                  Facility Water Intelligence.
                </h1>
              </div>

              <p className="lead">
                Operational summary of metered daily draw, hydraulic efficiency, and multi-zone allocation across active{' '}
                <strong>FS-S401</strong> pulse hardware and modeled enterprise loops.
              </p>

              {/* Inline Reporting Window & Source Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="seg-group" role="group" aria-label="Select reporting window">
                  {(
                    [
                      { id: '7d', label: '7 Days' },
                      { id: '30d', label: '30 Days' },
                      { id: '90d', label: '90 Days' },
                    ] as const
                  ).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="seg-btn"
                      aria-pressed={reportingPeriod === p.id}
                      onClick={() => setReportingPeriod(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="seg-group" role="group" aria-label="Select telemetry dataset source">
                  {(
                    [
                      { id: 'hybrid', label: 'Hybrid Audit' },
                      { id: 'physical', label: 'Physical Only' },
                      { id: 'demo', label: 'Demo Fleet' },
                    ] as const
                  ).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className="seg-btn"
                      aria-pressed={sourceMode === m.id}
                      onClick={() => handleSourceModeChange(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <p
                className="p-3 rounded border text-xs leading-relaxed"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper-raised)', color: 'var(--ink-muted)' }}
              >
                {dataset.hardwareBannerNote}
              </p>
            </div>

            <div className="span-6">
              <FigureBlock
                figNumber="FIG. 01"
                title="Metered Fleet Telemetry Matrix"
                subtitle={`${dataset.periodLabel} · Interactive sub-node allocation by zone, tier & sensor role`}
                provenance={dataset.effectiveProvenance}
                sourceNote="Hover or focus any square to inspect flow load & efficiency"
                tableHeaders={['Unit ID', 'Zone', 'Sensor Role', 'Daily L']}
                tableAlignRightCols={[3]}
                tableRows={dataset.matrixUnits.slice(0, 10).map(u => [
                  u.label,
                  u.zone,
                  u.sensorRole,
                  formatNumber(u.dailyLiters),
                ])}
              >
                <UnitMatrixChart
                  units={dataset.matrixUnits}
                  onShowTooltip={showTooltip}
                  onHideTooltip={hideTooltip}
                />
              </FigureBlock>
            </div>

            <div className="span-12 pt-4">
              <div className="kpi-strip">
                {dataset.overviewKpis.map(kpi => (
                  <div key={kpi.id} className="kpi-cell">
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-num">{kpi.value}</div>
                    <div className="kpi-sub">
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>
                        {kpi.unit}
                      </span>{' '}
                      · {kpi.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            02 · PERIOD COMPARISON
           ================================================================ */}
        <section id="s02" className="spread" data-spine="true" aria-labelledby="s02-heading">
          <div className="folio-line">
            <span>PERIOD-OVER-PERIOD HYDRAULIC VARIANCE</span>
            <span>SECTION 02 / 10 · COMPARISON</span>
          </div>

          <div className="grid-12">
            <div className="span-5 space-y-4">
              <div className="kicker">
                <span>02 · PERIOD COMPARISON</span>
                <span className={`provenance-mark ${provenanceTone}`}>
                  <i aria-hidden="true" />
                  {dataset.comparisonPeriodLabel} → {dataset.periodLabel}
                </span>
              </div>

              <h2 id="s02-heading" className="title title-md">
                Shift from Prior Cycle.
              </h2>

              <p className="lead">
                Dumbbell spans measure the absolute hydraulic movement between{' '}
                <strong>{dataset.comparisonPeriodLabel}</strong> (hollow marker) and{' '}
                <strong>{dataset.periodLabel}</strong> (solid dot). Green stems mark verified demand reduction; vermilion flags expansion.
              </p>

              <hr className="rule-hair" />

              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                Use the sort switches above the chart to rank zones by peak current draw, deepest conservation delta %, or baseline burden. All figures keep electrical INA219 channels strictly excluded until sensor calibration completes.
              </p>
            </div>

            <div className="span-7">
              <FigureBlock
                figNumber="FIG. 02"
                title="Previous vs Current Cycle Dumbbell"
                subtitle={`${dataset.comparisonPeriodLabel} against ${dataset.periodLabel}`}
                provenance={dataset.effectiveProvenance}
                sourceNote="Stems color-encoded for flow reduction vs increase"
                tableHeaders={['Zone', 'Prior (L)', 'Current (L)', 'Delta %']}
                tableAlignRightCols={[1, 2, 3]}
                tableRows={dataset.periodComparison.map(p => [
                  p.name,
                  formatNumber(p.previousLiters),
                  formatNumber(p.currentLiters),
                  `${p.deltaPct > 0 ? '+' : ''}${p.deltaPct.toFixed(1)}%`,
                ])}
              >
                <DumbbellPeriodChart
                  items={dataset.periodComparison}
                  currentPeriodLabel={dataset.periodLabel}
                  comparisonPeriodLabel={dataset.comparisonPeriodLabel}
                  onShowTooltip={showTooltip}
                  onHideTooltip={hideTooltip}
                />
              </FigureBlock>
            </div>
          </div>
        </section>

        {/* ================================================================
            03 · FACILITY / RESOURCE BREAKDOWN
           ================================================================ */}
        <section id="s03" className="spread" data-spine="true" aria-labelledby="s03-heading">
          <div className="folio-line">
            <span>ZONE ALLOCATION & ROTATED DEMAND RANKING</span>
            <span>SECTION 03 / 10 · BREAKDOWN</span>
          </div>

          <div className="grid-12">
            <div className="span-6 space-y-5">
              <div className="kicker">
                <span>03 · FACILITY BREAKDOWN</span>
                <span className={`provenance-mark ${provenanceTone}`}>
                  <i aria-hidden="true" />
                  {dataset.zoneBreakdowns.some(z => z.provenance === 'demo') ? 'INCLUDES DEMO ZONES' : 'FS-S401 VERIFIED'}
                </span>
              </div>

              <h2 id="s03-heading" className="title title-md">
                Where Water Volume Concentrates.
              </h2>

              <FigureBlock
                figNumber="FIG. 03A"
                title="100% Facility Zone Composition"
                subtitle="Proportional share of daily metered water draw"
                provenance={dataset.effectiveProvenance}
                sourceNote="Select zones in right panel to synchronize highlight"
                tableHeaders={['Code', 'Zone Name', 'Share %', 'Daily Volume']}
                tableAlignRightCols={[2, 3]}
                tableRows={dataset.zoneBreakdowns.map(z => [
                  z.regionCode,
                  z.name,
                  `${z.sharePct}%`,
                  formatCompactLiters(z.dailyLiters),
                ])}
              >
                {dataset.zoneBreakdowns.length === 0 ? (
                  <div className="p-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
                    No zone allocations configured under Physical Only empty state.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="flex h-7 w-full rounded-[3px] overflow-hidden border"
                      style={{ borderColor: 'var(--rule)' }}
                      role="img"
                      aria-label="100% stacked facility water draw breakdown"
                    >
                      {dataset.zoneBreakdowns.map((z, idx) => {
                        const colors = [
                          'var(--brand-band)',
                          'var(--series-a)',
                          'var(--series-c)',
                          'var(--series-d)',
                        ];
                        return (
                          <div
                            key={z.id}
                            style={{
                              width: `${z.sharePct}%`,
                              background: colors[idx % colors.length],
                            }}
                            title={`${z.name}: ${z.sharePct}% (${formatCompactLiters(z.dailyLiters)}/day)`}
                          />
                        );
                      })}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="fig-data-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Zone</th>
                            <th className="num">Share</th>
                            <th className="num">Daily</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataset.zoneBreakdowns.map(z => (
                            <tr key={z.id}>
                              <td className="mono-meta font-semibold">{z.regionCode}</td>
                              <td>
                                <div className="font-medium">{z.name}</div>
                                <div className="mono-meta text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                  {z.statusNote}
                                </div>
                              </td>
                              <td className="num mono-meta font-semibold">{z.sharePct}%</td>
                              <td className="num mono-meta">{formatCompactLiters(z.dailyLiters)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </FigureBlock>
            </div>

            <div className="span-6">
              <FigureBlock
                figNumber="FIG. 03B"
                title="Interactive Rotated-Numeral Allocation"
                subtitle="Click columns or use ← / → arrow keys to inspect zone drivers"
                provenance={dataset.effectiveProvenance}
                sourceNote="Normalized bar heights reflect share of monitored intake"
              >
                <RotatedKpiBars
                  items={dataset.rotatedKpiBars}
                  ariaLabel="Facility consumption breakdown columns"
                />
              </FigureBlock>
            </div>
          </div>
        </section>

        {/* ================================================================
            04 · CONSUMPTION TRENDS & MILESTONES
           ================================================================ */}
        <section id="s04" className="spread" aria-labelledby="s04-heading">
          <div className="folio-line">
            <span>HYDROLOGY TRENDLINE & SYSTEM MILESTONES</span>
            <span>SECTION 04 / 10 · TRENDS</span>
          </div>

          <div className="grid-12">
            <div className="span-4 space-y-4">
              <div className="kicker">
                <span>04 · CONSUMPTION TRENDS</span>
              </div>
              <h2 id="s04-heading" className="title title-md">
                Trajectory & Telemetry Checkpoints.
              </h2>
              <p className="lead">
                Tracks continuous daily draw against the prior rolling ceiling alongside collision-free hardware & control milestones.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                Click any square node on the milestone track (or tap any milestone card on mobile screens) to inspect verification context.
              </p>
            </div>

            <div className="span-8">
              <FigureBlock
                figNumber="FIG. 04"
                title="Daily Consumption Trajectory & Deployment Milestones"
                subtitle={`${dataset.periodLabel} hydraulic volume (L) vs baseline ceiling`}
                provenance={dataset.effectiveProvenance}
                sourceNote="Milestones dynamically tier-spaced to avoid horizontal label collisions"
                tableHeaders={['Date', 'Observed (L)', 'Baseline (L)', 'Flow (L/m)']}
                tableAlignRightCols={[1, 2, 3]}
                tableRows={dataset.trendSeries.map(t => [
                  t.isoDate,
                  formatNumber(t.dailyLiters),
                  formatNumber(t.baselineLiters),
                  t.flowRateLpm.toFixed(1),
                ])}
              >
                <TrendTimelineExplorer
                  trendSeries={dataset.trendSeries}
                  milestones={dataset.milestones}
                  onShowTooltip={showTooltip}
                  onHideTooltip={hideTooltip}
                />
              </FigureBlock>
            </div>
          </div>
        </section>

        {/* ================================================================
            05 · HISTORICAL CONSUMPTION REPORT (SCROLLYTELLING)
           ================================================================ */}
        <section id="s05" className="spread" aria-labelledby="s05-heading">
          <div className="folio-line">
            <span>MULTI-QUARTER LOAD COMPOSITION</span>
            <span>SECTION 05 / 10 · HISTORICAL</span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="kicker">
                <span>05 · HISTORICAL CONSUMPTION REPORT</span>
                <span className={`provenance-mark ${provenanceTone}`}>
                  <i aria-hidden="true" />
                  {provenanceText}
                </span>
              </div>
              <h2 id="s05-heading" className="title title-md">
                Shifting Load Anatomy Across Quarters.
              </h2>
            </div>

            <ScrollyStackedColumns
              periods={dataset.stackedPeriods}
              steps={dataset.scrollySteps}
              onShowTooltip={showTooltip}
              onHideTooltip={hideTooltip}
            />
          </div>
        </section>

        {/* ================================================================
            06 · CONSUMPTION PATTERN HEATMAP
           ================================================================ */}
        <section id="s06" className="spread" aria-labelledby="s06-heading">
          <div className="folio-line">
            <span>DIURNAL & ZONE INTENSITY MATRIX</span>
            <span>SECTION 06 / 10 · HEATMAP</span>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="kicker">
                  <span>06 · CONSUMPTION PATTERN HEATMAP</span>
                </div>
                <h2 id="s06-heading" className="title title-md">
                  Where Peak Intensity Concentrates.
                </h2>
              </div>
              <p className="text-xs max-w-md" style={{ color: 'var(--ink-muted)' }}>
                Click column headers to rank zones by any 4-hour block, scrub the intensity threshold slider, or navigate cells with arrow keys.
              </p>
            </div>

            <FigureBlock
              figNumber="FIG. 06"
              title="Diurnal Load Intensity Matrix (0–100 Index)"
              subtitle="Peak midday cooling load versus overnight cistern transfer"
              provenance={dataset.effectiveProvenance}
              sourceNote="Crosshair dims out-of-focus rows/columns; swipe horizontally on narrow viewports"
              tableHeaders={['Zone', ...dataset.heatmapColumns]}
              tableAlignRightCols={[1, 2, 3, 4, 5, 6]}
              tableRows={dataset.heatmapRows.map(r => [r.sector, ...r.values])}
            >
              <PatternHeatmap
                columns={dataset.heatmapColumns}
                rows={dataset.heatmapRows}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
              />
            </FigureBlock>
          </div>
        </section>

        {/* ================================================================
            07 · RESOURCE DISTRIBUTION
           ================================================================ */}
        <section id="s07" className="spread" aria-labelledby="s07-heading">
          <div className="folio-line">
            <span>VERIFICATION LATTICE & CORRIDOR VARIANCE</span>
            <span>SECTION 07 / 10 · DISTRIBUTION</span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="kicker">
                <span>07 · RESOURCE DISTRIBUTION</span>
                <span className="provenance-mark is-physical">
                  <i aria-hidden="true" />
                  HARDWARE TRANSPARENCY AUDIT
                </span>
              </div>
              <h2 id="s07-heading" className="title title-md">
                Telemetry Coverage & Target Adherence.
              </h2>
            </div>

            <FigureBlock
              figNumber="FIG. 07"
              title="Instrumentation Share & Target Variance Distribution"
              subtitle="Explicit separation of FS-S401 verified pulses, demo fleet cohorts, and uncalibrated INA219 channels"
              provenance={dataset.effectiveProvenance}
              sourceNote="Zero fabricated power metrics or synthetic customer survey claims"
            >
              <DistributionWaffleAndBars
                waffleItems={dataset.waffleItems}
                divergingVariance={dataset.divergingVariance}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
              />
            </FigureBlock>
          </div>
        </section>

        {/* ================================================================
            08 · USAGE RELATIONSHIP ANALYSIS
           ================================================================ */}
        <section id="s08" className="spread" aria-labelledby="s08-heading">
          <div className="folio-line">
            <span>ORDINARY LEAST SQUARES REGRESSION</span>
            <span>SECTION 08 / 10 · CORRELATION</span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="kicker">
                <span>08 · USAGE RELATIONSHIP ANALYSIS</span>
              </div>
              <h2 id="s08-heading" className="title title-md">
                Utilization Score vs Monthly Volume.
              </h2>
            </div>

            <FigureBlock
              figNumber="FIG. 08"
              title="Interactive Client-Side OLS Regression & Category Scatter"
              subtitle="Live slope (β₁) and fit coefficient (R²) recomputed across visible observations"
              provenance={dataset.effectiveProvenance}
              sourceNote="Multi-shape markers encode loop class without relying on color alone"
              tableHeaders={['Node', 'Category', 'Utilization %', 'Volume (kL/mo)']}
              tableAlignRightCols={[2, 3]}
              tableRows={dataset.scatterObservations.map(s => [
                s.label,
                s.category,
                s.xFlowScore,
                s.yMonthlyLitersK,
              ])}
            >
              <ScatterRegressionChart
                observations={dataset.scatterObservations}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
              />
            </FigureBlock>
          </div>
        </section>

        {/* ================================================================
            09 · BUSINESS DATA EXPLORER & SCENARIO EXPORT
           ================================================================ */}
        <section id="s09" className="spread" aria-labelledby="s09-heading">
          <div className="folio-line">
            <span>CONSERVATION SCENARIOS & FILTERABLE LEDGER</span>
            <span>SECTION 09 / 10 · EXPLORER</span>
          </div>

          <div className="grid-12">
            <div className="span-4 space-y-5">
              <div className="kicker">
                <span>09 · BUSINESS DATA EXPLORER</span>
              </div>
              <h2 id="s09-heading" className="title title-md">
                Forward Targets & Full Audit Ledger.
              </h2>

              <FigureBlock
                figNumber="FIG. 09A"
                title="Demand Intensity Scenarios"
                subtitle="Baseline vs FS-S401 triage & reclaim"
                provenance={dataset.effectiveProvenance}
                sourceNote="Electrical kWh targets await INA219 calibration"
              >
                <RotatedKpiBars
                  items={dataset.scenarioBars}
                  ariaLabel="Water intensity reduction scenarios"
                />
              </FigureBlock>
            </div>

            <div className="span-8">
              <FigureBlock
                figNumber="FIG. 09B"
                title="Filterable Facility Telemetry Ledger"
                subtitle="Search, zone filter, date window, column sort, inline sparklines & formula-safe CSV"
                provenance={dataset.effectiveProvenance}
                sourceNote={`Last synced: ${new Date(dataset.fetchedAtIso).toLocaleTimeString()}`}
              >
                <BusinessDataExplorer
                  rows={dataset.explorerRows}
                  isLoading={isLoadingPhysical}
                  errorMessage={physicalSnapshot.error}
                  onRetrySync={loadPhysical}
                  onExportComplete={count =>
                    showToast(`Exported ${count} rows to aquawatt-business-analytics.csv`, 'success')
                  }
                />
              </FigureBlock>
            </div>
          </div>
        </section>

        {/* ================================================================
            10 · ROLLING FACILITY ACCOUNT
           ================================================================ */}
        <RollingFacilityAccountSection
          sourceMode={sourceMode}
          physicalSnapshot={physicalSnapshot}
          isLoadingPhysical={isLoadingPhysical}
          onRefreshPhysical={loadPhysical}
          onSwitchToHybrid={() => handleSourceModeChange('hybrid')}
        />
      </main>

      {/* Shared Accessible Floating Hover/Focus Tooltip */}
      {tooltip.visible && (
        <div
          id="tt"
          role="tooltip"
          className="folio-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tt-title">{tooltip.title}</div>
          <div className="tt-meta">{tooltip.meta}</div>
        </div>
      )}

      <FolioControlPanel
        isOpen={controlsOpen}
        onClose={() => setControlsOpen(false)}
        sourceMode={sourceMode}
        onSourceModeChange={handleSourceModeChange}
        reportingPeriod={reportingPeriod}
        onReportingPeriodChange={setReportingPeriod}
        palette={palette}
        onPaletteChange={setPalette}
        theme={theme}
        onThemeChange={setTheme}
        showGridOverlay={showGridOverlay}
        onToggleGridOverlay={toggleGridOverlay}
        onRefreshPhysical={loadPhysical}
        isRefreshing={isLoadingPhysical}
        physicalRecordCount={dataset.physicalRecordCount}
      />
    </div>
  );
};
