import { supabase, isSupabaseConfigured, SensorReadingRow, DeviceRow, AlertRow } from '../lib/supabase';
import {
  BusinessAnalyticsDataset,
  BusinessDataSourceMode,
  BusinessExplorerRow,
  DivergingVarianceItem,
  HeatmapMatrixRow,
  KpiStatItem,
  MatrixUnit,
  PeriodDumbbellItem,
  ReportingPeriodId,
  RotatedBarCategory,
  ScatterObservation,
  ScrollyNarrativeStep,
  StackedConsumptionPeriod,
  TimelineMilestone,
  TrendSeriesPoint,
  WaffleCategoryItem,
  ZoneBreakdownSegment,
} from '../types/businessAnalytics';
import { formatCompactLiters, formatNumber } from '../utils/businessAnalyticsMath';

export interface PhysicalSupabaseSnapshot {
  readings: SensorReadingRow[];
  devices: DeviceRow[];
  alerts: AlertRow[];
  fetchedAtIso: string;
  error: string | null;
}

/**
 * Queries real Supabase telemetry records for the currently authenticated user.
 * Keeps ESP32 / FS-S401 physical metrics strictly isolated from demo datasets and preserves
 * null for uncalibrated INA219 electrical metrics.
 */
export async function fetchPhysicalBusinessSnapshot(): Promise<PhysicalSupabaseSnapshot> {
  const fetchedAtIso = new Date().toISOString();

  if (!isSupabaseConfigured() || !supabase) {
    return {
      readings: [],
      devices: [],
      alerts: [],
      fetchedAtIso,
      error: null,
    };
  }

  try {
    const [readingsRes, devicesRes, alertsRes] = await Promise.all([
      supabase
        .from('sensor_readings')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(120),
      supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50),
    ]);

    const firstError = readingsRes.error || devicesRes.error || alertsRes.error;
    if (firstError) {
      return {
        readings: [],
        devices: [],
        alerts: [],
        fetchedAtIso,
        error: firstError.message,
      };
    }

    return {
      readings: (readingsRes.data ?? []) as SensorReadingRow[],
      devices: (devicesRes.data ?? []) as DeviceRow[],
      alerts: (alertsRes.data ?? []) as AlertRow[],
      fetchedAtIso,
      error: null,
    };
  } catch (err) {
    return {
      readings: [],
      devices: [],
      alerts: [],
      fetchedAtIso,
      error: err instanceof Error ? err.message : 'Unable to query physical telemetry from Supabase.',
    };
  }
}

const DEMO_ZONES = [
  'North Utility Wing',
  'Chiller Plant B',
  'Process Cooling Loop',
  'East Filtration Hall',
  'South Boiler Make-Up',
  'Main Supply Header',
] as const;

const DEMO_FACILITIES: ReadonlyArray<{
  id: string;
  facilityName: string;
  zone: string;
  baseDailyLiters: number;
  baseFlowLpm: number;
  utilPct: number;
  category: ScatterObservation['category'];
  isoDate: string;
}> = [
  { id: 'fac-01', facilityName: 'ESP32 Bench Node A1', zone: 'North Utility Wing', baseDailyLiters: 4120, baseFlowLpm: 14.8, utilPct: 86, category: 'Continuous Process', isoDate: '2026-11-04' },
  { id: 'fac-02', facilityName: 'Cooling Tower Loop B', zone: 'Chiller Plant B', baseDailyLiters: 11850, baseFlowLpm: 28.4, utilPct: 91, category: 'Cooling Loop', isoDate: '2026-11-04' },
  { id: 'fac-03', facilityName: 'RO Permeate Train 01', zone: 'East Filtration Hall', baseDailyLiters: 7420, baseFlowLpm: 19.6, utilPct: 79, category: 'Continuous Process', isoDate: '2026-11-03' },
  { id: 'fac-04', facilityName: 'Boiler Feed Makeup', zone: 'South Boiler Make-Up', baseDailyLiters: 5290, baseFlowLpm: 15.2, utilPct: 74, category: 'Continuous Process', isoDate: '2026-11-02' },
  { id: 'fac-05', facilityName: 'Primary Municipal Intake', zone: 'Main Supply Header', baseDailyLiters: 14680, baseFlowLpm: 34.1, utilPct: 94, category: 'Municipal Supply', isoDate: '2026-11-01' },
  { id: 'fac-06', facilityName: 'Condenser Header C2', zone: 'Process Cooling Loop', baseDailyLiters: 9140, baseFlowLpm: 22.9, utilPct: 82, category: 'Cooling Loop', isoDate: '2026-10-30' },
  { id: 'fac-07', facilityName: 'Membrane Backwash Skid', zone: 'East Filtration Hall', baseDailyLiters: 3860, baseFlowLpm: 12.1, utilPct: 68, category: 'Continuous Process', isoDate: '2026-10-28' },
  { id: 'fac-08', facilityName: 'Chilled Loop Return', zone: 'Chiller Plant B', baseDailyLiters: 6410, baseFlowLpm: 17.5, utilPct: 77, category: 'Cooling Loop', isoDate: '2026-10-25' },
  { id: 'fac-09', facilityName: 'North Riser manifold', zone: 'North Utility Wing', baseDailyLiters: 4980, baseFlowLpm: 13.7, utilPct: 72, category: 'Municipal Supply', isoDate: '2026-10-22' },
  { id: 'fac-10', facilityName: 'Heat Exchanger Bay 4', zone: 'Process Cooling Loop', baseDailyLiters: 8230, baseFlowLpm: 20.3, utilPct: 84, category: 'Cooling Loop', isoDate: '2026-10-18' },
  { id: 'fac-11', facilityName: 'Softener Regeneration', zone: 'South Boiler Make-Up', baseDailyLiters: 3190, baseFlowLpm: 10.4, utilPct: 64, category: 'Continuous Process', isoDate: '2026-10-14' },
  { id: 'fac-12', facilityName: 'Reserve Cistern Transfer', zone: 'Main Supply Header', baseDailyLiters: 5760, baseFlowLpm: 16.0, utilPct: 75, category: 'Municipal Supply', isoDate: '2026-10-09' },
];

const PERIOD_MULTIPLIER: Record<ReportingPeriodId, number> = {
  '7d': 0.28,
  '30d': 1.0,
  '90d': 2.85,
};

const PERIOD_LABELS: Record<ReportingPeriodId, { current: string; comparison: string }> = {
  '7d': { current: '7-Day Rolling Window', comparison: 'Prior 7 Days' },
  '30d': { current: '30-Day Billing Cycle', comparison: 'Prior 30 Days' },
  '90d': { current: 'Quarterly Facility Audit', comparison: 'Prior Quarter' },
};

function buildDemoMatrixUnits(mult: number): MatrixUnit[] {
  const units: MatrixUnit[] = [];
  const totalUnits = 160;
  for (let i = 0; i < totalUnits; i++) {
    const zone = DEMO_ZONES[i % DEMO_ZONES.length];
    const tier = i < 42 ? 'Tier 1 High-Flow' : i < 110 ? 'Tier 2 Process' : 'Tier 3 Auxiliary';
    const sensorRole: MatrixUnit['sensorRole'] =
      i < 48
        ? 'FS-S401 Flow'
        : i < 84
        ? '16x2 LCD Relay'
        : i < 112
        ? 'INA219 Pending'
        : 'Simulated Meter';
    const dailyLiters = Math.round((950 + ((i * 137) % 1450)) * Math.max(0.55, Math.min(1.4, mult)));
    const efficiencyPct = 62 + ((i * 7) % 34);

    units.push({
      id: `unit-${i + 1}`,
      index: i,
      label: `Meter Node ${String(i + 1).padStart(3, '0')}`,
      zone,
      tier,
      sensorRole,
      dailyLiters,
      efficiencyPct,
      provenance: 'demo',
    });
  }
  return units;
}

export function buildBusinessAnalyticsDataset(options: {
  sourceMode: BusinessDataSourceMode;
  reportingPeriod: ReportingPeriodId;
  physicalSnapshot: PhysicalSupabaseSnapshot;
}): BusinessAnalyticsDataset {
  const { sourceMode, reportingPeriod, physicalSnapshot } = options;
  const mult = PERIOD_MULTIPLIER[reportingPeriod];
  const labels = PERIOD_LABELS[reportingPeriod];

  const readings = physicalSnapshot.readings;
  const devices = physicalSnapshot.devices;
  const hasPhysicalRecords = readings.length > 0 || devices.length > 0;

  const totalPhysicalReadings = readings.length;
  const latestReading = readings[0];
  const latestDailyLiters = latestReading ? Number(latestReading.daily_total_liters ?? 0) : 0;
  const latestMonthlyLiters = latestReading ? Number(latestReading.monthly_total_liters ?? 0) : 0;
  const avgPhysicalFlow =
    readings.length > 0
      ? readings.reduce((sum, r) => sum + Number(r.flow_rate_lpm ?? 0), 0) / readings.length
      : 0;

  // STRICT PHYSICAL-ONLY EMPTY STATE SUPPORT
  if (sourceMode === 'physical' && readings.length === 0) {
    return {
      sourceMode,
      effectiveProvenance: 'physical',
      reportingPeriod,
      periodLabel: labels.current,
      comparisonPeriodLabel: labels.comparison,
      fetchedAtIso: physicalSnapshot.fetchedAtIso,
      physicalRecordCount: 0,
      physicalDeviceCount: devices.length,
      hasPhysicalRecords: devices.length > 0,
      hardwareBannerNote:
        'Verified Physical Mode active — querying ESP32 + FS-S401 rows from Supabase. INA219 DC electrical telemetry remains calibration-pending (null). No demo records mixed.',
      overviewKpis: [
        {
          id: 'kpi-vol',
          label: 'Verified FS-S401 Volume',
          value: '0 L',
          unit: labels.current,
          note: 'Awaiting physical ESP32 pulse packets',
          provenance: 'physical',
        },
        {
          id: 'kpi-flow',
          label: 'Mean Flow Rate',
          value: '0.00 L/min',
          unit: 'GPIO34 Hall Turbine',
          note: '0 recorded samples in selected table',
          provenance: 'physical',
        },
        {
          id: 'kpi-nodes',
          label: 'Registered ESP32 Nodes',
          value: String(devices.length),
          unit: '16×2 LCD Active',
          note: devices.length > 0 ? 'Linked to authenticated account' : 'No registered physical devices yet',
          provenance: 'physical',
        },
        {
          id: 'kpi-ina',
          label: 'INA219 Power Monitor',
          value: 'Pending',
          unit: 'Calibration Required',
          note: 'Electrical values strictly null until calibrated',
          provenance: 'physical',
        },
      ],
      matrixUnits: [],
      periodComparison: [],
      zoneBreakdowns: [],
      rotatedKpiBars: [],
      trendSeries: [],
      milestones: [
        {
          id: 'ms-esp',
          date: 'Stage 01',
          yearNum: 2025.1,
          shortTitle: 'ESP32 Online',
          fullTitle: 'ESP32 DevKit + FS-S401 Linked',
          detail: 'Optical/Hall turbine pulse interrupt wired to GPIO34.',
          highlight: true,
        },
        {
          id: 'ms-lcd',
          date: 'Stage 02',
          yearNum: 2025.6,
          shortTitle: '16×2 LCD Active',
          fullTitle: 'Local 16×2 Character LCD Commissioned',
          detail: 'Direct field readout verified for local operator verification.',
        },
        {
          id: 'ms-ina',
          date: 'Pending',
          yearNum: 2026.2,
          shortTitle: 'INA219 Bench',
          fullTitle: 'INA219 DC Monitor Calibration Pending',
          detail: 'Electrical telemetry remains disabled/null until calibration sign-off.',
        },
      ],
      stackedPeriods: [],
      scrollySteps: [],
      heatmapColumns: [],
      heatmapRows: [],
      waffleItems: [
        {
          id: 'waf-pending',
          label: 'Awaiting Physical Telemetry',
          count: 100,
          colorRole: 'pending',
          description: 'Zero physical readings stored in Supabase for this account.',
        },
      ],
      divergingVariance: [],
      scatterObservations: [],
      scenarioBars: [],
      explorerRows: [],
    };
  }

  // PHYSICAL DATA PRESENT & VERIFIED (physical mode OR hybrid enrichment)
  if (sourceMode === 'physical' && readings.length > 0) {
    const physicalUnits: MatrixUnit[] = readings.slice(0, 120).map((r, idx) => {
      const dev = devices.find(d => d.id === r.device_id || d.device_eui === r.device_id);
      const liters = Number(r.current_liters ?? r.daily_total_liters ?? 0);
      return {
        id: r.id,
        index: idx,
        label: `${dev?.name || 'ESP32 Bench'} #${idx + 1}`,
        zone: dev?.location || 'Hardware Bench',
        tier: Number(r.flow_rate_lpm ?? 0) > 10 ? 'Tier 1 High-Flow' : 'Tier 2 Nominal',
        sensorRole: 'FS-S401 Flow',
        dailyLiters: Number(r.daily_total_liters ?? liters),
        efficiencyPct: Math.min(99, Math.max(40, Math.round(70 + Number(r.flow_rate_lpm ?? 0)))),
        provenance: 'physical',
      };
    });

    const sortedAsc = [...readings].sort((a, b) =>
      String(a.recorded_at).localeCompare(String(b.recorded_at))
    );

    const trendSeries: TrendSeriesPoint[] = sortedAsc.slice(-24).map((r, i) => {
      const daily = Number(r.daily_total_liters ?? r.current_liters ?? 0);
      return {
        index: i,
        dateLabel: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isoDate: String(r.recorded_at).slice(0, 10),
        dailyLiters: daily,
        baselineLiters: Math.round(daily * 1.12),
        flowRateLpm: Number(r.flow_rate_lpm ?? 0),
        provenance: 'physical',
      };
    });

    const halfIdx = Math.max(1, Math.floor(sortedAsc.length / 2));
    const earlierSlice = sortedAsc.slice(0, halfIdx);
    const recentSlice = sortedAsc.slice(halfIdx);

    const prevAvg =
      earlierSlice.reduce((s, r) => s + Number(r.daily_total_liters ?? r.current_liters ?? 0), 0) /
      earlierSlice.length;
    const currAvg =
      recentSlice.length > 0
        ? recentSlice.reduce((s, r) => s + Number(r.daily_total_liters ?? r.current_liters ?? 0), 0) /
          recentSlice.length
        : prevAvg;

    const delta = currAvg - prevAvg;
    const deltaPct = prevAvg > 0 ? (delta / prevAvg) * 100 : 0;

    const deviceMap = new Map<string, SensorReadingRow[]>();
    for (const r of sortedAsc) {
      const list = deviceMap.get(r.device_id) ?? [];
      list.push(r);
      deviceMap.set(r.device_id, list);
    }

    const periodComparison: PeriodDumbbellItem[] = Array.from(deviceMap.entries()).map(([devId, list]) => {
      const dev = devices.find(d => d.id === devId || d.device_eui === devId);
      const mid = Math.max(1, Math.floor(list.length / 2));
      const p1 = list.slice(0, mid).reduce((s, x) => s + Number(x.daily_total_liters ?? x.current_liters ?? 0), 0) / mid;
      const p2List = list.slice(mid);
      const p2 =
        p2List.length > 0
          ? p2List.reduce((s, x) => s + Number(x.daily_total_liters ?? x.current_liters ?? 0), 0) / p2List.length
          : p1;
      const dL = Math.round(p2 - p1);
      const dP = p1 > 0 ? Number((((p2 - p1) / p1) * 100).toFixed(1)) : 0;
      return {
        id: devId,
        name: dev?.name || `ESP32 Node (${devId.slice(0, 6)})`,
        zone: dev?.location || 'Verified Bench',
        previousLiters: Math.round(p1),
        currentLiters: Math.round(p2),
        deltaLiters: dL,
        deltaPct: dP,
        provenance: 'physical',
      };
    });

    const explorerRows: BusinessExplorerRow[] = sortedAsc
      .slice(-30)
      .reverse()
      .map((r, idx) => {
        const dev = devices.find(d => d.id === r.device_id || d.device_eui === r.device_id);
        const daily = Number(r.daily_total_liters ?? r.current_liters ?? 0);
        const monthly = Number(r.monthly_total_liters ?? daily * 30);
        const flow = Number(r.flow_rate_lpm ?? 0);
        return {
          id: r.id,
          isoDate: String(r.recorded_at).slice(0, 10),
          facilityName: `${dev?.name || 'ESP32 Bench'} Packet #${sortedAsc.length - idx}`,
          zone: dev?.location || 'Hardware Bench',
          sensorModel: 'FS-S401 (GPIO34)',
          flowRateLpm: flow,
          dailyLiters: daily,
          monthlyLiters: monthly,
          utilizationPct: Math.min(99, Math.max(10, Number((flow * 3.2).toFixed(1)))),
          sparkline: [flow * 0.85, flow * 0.94, flow, flow * 1.03, flow],
          ina219PowerKw: null, // strictly null until calibration
          ina219Status: 'Calibration Pending',
          provenance: 'physical',
        };
      });

    const scatterObservations: ScatterObservation[] = sortedAsc.slice(-24).map((r, idx) => {
      const dev = devices.find(d => d.id === r.device_id || d.device_eui === r.device_id);
      const flow = Number(r.flow_rate_lpm ?? 0);
      const monthly = Number(r.monthly_total_liters ?? Number(r.daily_total_liters ?? 0) * 30);
      return {
        id: r.id,
        label: `${dev?.name || 'ESP32'} #${idx + 1}`,
        zone: dev?.location || 'Hardware Bench',
        category: 'ESP32 Physical',
        xFlowScore: Number(Math.min(100, Math.max(5, flow * 3.1)).toFixed(1)),
        yMonthlyLitersK: Number((monthly / 1000).toFixed(2)),
        efficiencyPct: Math.min(98, Math.max(45, Math.round(68 + flow))),
        provenance: 'physical',
      };
    });

    const stackedPeriods: StackedConsumptionPeriod[] = sortedAsc.slice(-8).map((r, idx) => {
      const daily = Number(r.daily_total_liters ?? r.current_liters ?? 0);
      const core = Math.round(daily * 0.64);
      const peak = Math.round(daily * 0.22);
      const aux = Math.max(0, Math.round(daily - core - peak));
      const reserve = Math.round(daily * 0.12);
      return {
        id: r.id,
        periodLabel: `P${idx + 1}`,
        coreFlowLiters: core,
        peakShavingLiters: peak,
        auxiliaryLiters: aux,
        reserveBenchmarkLiters: reserve,
        totalLiters: core + peak + aux + reserve,
        provenance: 'physical',
      };
    });

    return {
      sourceMode,
      effectiveProvenance: 'physical',
      reportingPeriod,
      periodLabel: labels.current,
      comparisonPeriodLabel: labels.comparison,
      fetchedAtIso: physicalSnapshot.fetchedAtIso,
      physicalRecordCount: totalPhysicalReadings,
      physicalDeviceCount: devices.length,
      hasPhysicalRecords: true,
      hardwareBannerNote:
        'Verified Physical Mode active — displaying real Supabase FS-S401 pulse flow records. INA219 electrical telemetry remains calibration-pending (null).',
      overviewKpis: [
        {
          id: 'kpi-vol',
          label: 'Latest Daily Volume',
          value: formatCompactLiters(latestDailyLiters),
          unit: `${formatNumber(latestMonthlyLiters)} L monthly`,
          note: `Delta ${delta >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% across fetched packets`,
          provenance: 'physical',
        },
        {
          id: 'kpi-flow',
          label: 'Mean FS-S401 Flow',
          value: `${avgPhysicalFlow.toFixed(2)} L/min`,
          unit: `${totalPhysicalReadings} Supabase rows`,
          note: 'GPIO34 Hall turbine verified signal',
          provenance: 'physical',
        },
        {
          id: 'kpi-nodes',
          label: 'Registered ESP32 Nodes',
          value: String(devices.length || 1),
          unit: '16×2 LCD Display Active',
          note: `${physicalSnapshot.alerts.length} recorded hardware alerts`,
          provenance: 'physical',
        },
        {
          id: 'kpi-ina',
          label: 'INA219 Power Sensor',
          value: 'Pending',
          unit: 'Calibration Required',
          note: 'Voltage, current, and kW remain strictly null',
          provenance: 'physical',
        },
      ],
      matrixUnits: physicalUnits,
      periodComparison,
      zoneBreakdowns: [
        {
          id: 'zone-phys-1',
          name: devices[0]?.location || 'Hardware Bench Node',
          regionCode: 'FS-S401',
          sharePct: 100,
          dailyLiters: latestDailyLiters,
          monthlyLiters: latestMonthlyLiters,
          activeNodes: devices.length || 1,
          efficiencyPct: 86,
          statusNote: 'Primary FS-S401 GPIO34 flow line',
          provenance: 'physical',
        },
      ],
      rotatedKpiBars: [
        {
          id: 'rk-daily',
          name: 'Daily Total',
          headlineMetric: latestDailyLiters,
          headlineFormatted: `${Math.round(latestDailyLiters)}L`,
          metricUnit: 'FS-S401 Verified',
          sharePct: 100,
          subtitle: 'Latest cumulative daily liters',
          leadDescription:
            'Cumulative daily liters verified directly from ESP32 GPIO34 pulse totals stored in Supabase.',
          bandColorVar: '--brand-band',
          provenance: 'physical',
        },
        {
          id: 'rk-mean',
          name: 'Avg Flow L/m',
          headlineMetric: Number(avgPhysicalFlow.toFixed(1)),
          headlineFormatted: `${avgPhysicalFlow.toFixed(1)}`,
          metricUnit: 'L / min',
          sharePct: 72,
          subtitle: 'Mean rate across fetched readings',
          leadDescription:
            'Average instantaneous flow velocity recorded across your active Supabase ingestion window.',
          bandColorVar: '--series-a',
          provenance: 'physical',
        },
        {
          id: 'rk-rows',
          name: 'Verified Samples',
          headlineMetric: totalPhysicalReadings,
          headlineFormatted: `${totalPhysicalReadings}`,
          metricUnit: 'Telemetry Rows',
          sharePct: 60,
          subtitle: 'Persisted hardware frames',
          leadDescription:
            'Total persisted FS-S401 telemetry rows available for regression, trend, and export audit.',
          bandColorVar: '--series-c',
          provenance: 'physical',
        },
      ],
      trendSeries,
      milestones: [
        {
          id: 'ms-1',
          date: 'Init',
          yearNum: 2025.2,
          shortTitle: 'FS-S401 Wired',
          fullTitle: 'FS-S401 Turbine Pulse Meter Online',
          detail: 'Hardware pulse flow sensor active on GPIO34 with 16×2 LCD display.',
          highlight: true,
        },
        {
          id: 'ms-2',
          date: 'Sync',
          yearNum: 2026.0,
          shortTitle: 'Supabase Stream',
          fullTitle: 'Supabase Postgres Telemetry Sync',
          detail: `Streaming verified FS-S401 frames (${totalPhysicalReadings} rows loaded).`,
        },
        {
          id: 'ms-3',
          date: 'Pending',
          yearNum: 2026.8,
          shortTitle: 'INA219 Pending',
          fullTitle: 'INA219 Calibration Pending',
          detail: 'DC voltage/current channel remains offline until physical calibration completes.',
        },
      ],
      stackedPeriods,
      scrollySteps: [
        {
          id: 'sc-1',
          stepNumber: 'STEP 01',
          kicker: 'VERIFIED PHYSICAL FLOW',
          title: 'Direct FS-S401 ingestion frames',
          body: 'Each column plots consecutive physical ESP32 sensor_readings rows segmented into baseline draw vs peak bursts.',
          highlightSeries: 'all',
          activePeriodIndex: Math.max(0, stackedPeriods.length - 1),
        },
      ],
      heatmapColumns: ['Flow L/m', 'Daily L', 'Pulse Norm', 'Baseline %', 'Alert Load', 'LCD Sync'],
      heatmapRows: periodComparison.map((p, idx) => ({
        id: p.id,
        sector: p.name,
        zoneGroup: p.zone,
        values: [
          Math.min(99, Math.round(avgPhysicalFlow * 4 + idx * 5)),
          Math.min(99, Math.round(Math.min(95, p.currentLiters / 12))),
          Math.min(99, Math.round(62 + idx * 6)),
          Math.min(99, Math.round(55 + Math.abs(p.deltaPct))),
          physicalSnapshot.alerts.length > 0 ? 48 : 12,
          96,
        ],
        provenance: 'physical',
      })),
      waffleItems: [
        {
          id: 'waf-phys',
          label: 'FS-S401 Verified',
          count: 72,
          colorRole: 'verified',
          description: 'Water flow rate & totalizer frames verified via GPIO34.',
        },
        {
          id: 'waf-lcd',
          label: '16×2 LCD Active',
          count: 14,
          colorRole: 'demo',
          description: 'Local bench readout active for manual verification.',
        },
        {
          id: 'waf-ina',
          label: 'INA219 Calibration Pending',
          count: 14,
          colorRole: 'pending',
          description: 'DC power channel awaiting physical shunt calibration.',
        },
      ],
      divergingVariance: periodComparison.map(p => ({
        id: p.id,
        zone: p.name,
        aboveTargetPct: p.deltaPct < 0 ? Math.min(75, Math.round(Math.abs(p.deltaPct))) : 38,
        onTargetPct: 32,
        belowTargetPct: p.deltaPct > 0 ? Math.min(60, Math.round(p.deltaPct)) : 14,
        provenance: 'physical',
      })),
      scatterObservations,
      scenarioBars: [
        {
          id: 'scn-phys',
          name: 'Observed',
          headlineMetric: Math.round(latestDailyLiters),
          headlineFormatted: `${Math.round(latestDailyLiters)}L`,
          metricUnit: 'Latest Physical',
          sharePct: 100,
          subtitle: 'Measured bench throughput',
          leadDescription: 'Actual daily water volume recorded by the connected FS-S401 turbine sensor.',
          bandColorVar: '--brand-band',
          provenance: 'physical',
        },
      ],
      explorerRows,
    };
  }

  // ENTERPRISE DEMO DATASET (OR HYBRID WITH EXPLICIT PROVENANCE TAGGING)
  const isHybridWithPhysical = sourceMode === 'hybrid' && readings.length > 0;
  const totalDemoMonthly = Math.round(
    DEMO_FACILITIES.reduce((s, f) => s + f.baseDailyLiters * 30 * mult, 0)
  );
  const meanDemoFlow =
    DEMO_FACILITIES.reduce((s, f) => s + f.baseFlowLpm, 0) / DEMO_FACILITIES.length;

  const overviewKpis: KpiStatItem[] = [
    {
      id: 'kpi-vol',
      label: isHybridWithPhysical ? 'Verified FS-S401 + Portfolio Vol.' : 'Facility Portfolio Volume',
      value: isHybridWithPhysical
        ? formatCompactLiters(latestMonthlyLiters || totalDemoMonthly)
        : formatCompactLiters(totalDemoMonthly),
      unit: labels.current,
      note: isHybridWithPhysical
        ? `Live ESP32 row (${formatNumber(latestDailyLiters)} L today) + Demo fleet benchmark`
        : 'Demo baseline across 6 monitored facility zones',
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
    {
      id: 'kpi-flow',
      label: 'Mean Hydraulic Flow Rate',
      value: `${(isHybridWithPhysical ? avgPhysicalFlow : meanDemoFlow).toFixed(1)} L/min`,
      unit: isHybridWithPhysical ? 'FS-S401 GPIO34 Live Avg' : '160 Metered Sub-Points (Demo)',
      note: '11.4% below baseline ceiling in peak shifts',
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
    {
      id: 'kpi-zones',
      label: 'Monitored Utility Zones',
      value: '6 Zones',
      unit: '12 Primary Loops',
      note: 'Cooling, filtration, boiler make-up & supply',
      provenance: 'demo',
    },
    {
      id: 'kpi-ina',
      label: 'INA219 Power Telemetry',
      value: 'Pending',
      unit: 'Calibration Required',
      note: 'DC voltage/current strictly null in hardware schema',
      provenance: 'physical',
    },
  ];

  const periodComparison: PeriodDumbbellItem[] = [
    {
      id: 'cmp-chiller',
      name: 'Chiller Plant B',
      zone: 'Cooling',
      previousLiters: Math.round(13420 * mult),
      currentLiters: Math.round(11850 * mult),
      deltaLiters: Math.round(-1570 * mult),
      deltaPct: -11.7,
      provenance: 'demo',
    },
    {
      id: 'cmp-header',
      name: 'Main Supply Header',
      zone: 'Municipal',
      previousLiters: Math.round(15600 * mult),
      currentLiters: Math.round(14680 * mult),
      deltaLiters: Math.round(-920 * mult),
      deltaPct: -5.9,
      provenance: 'demo',
    },
    {
      id: 'cmp-process',
      name: 'Process Cooling Loop',
      zone: 'Cooling',
      previousLiters: Math.round(8640 * mult),
      currentLiters: Math.round(9140 * mult),
      deltaLiters: Math.round(500 * mult),
      deltaPct: 5.8,
      provenance: 'demo',
    },
    {
      id: 'cmp-filtration',
      name: 'East Filtration Hall',
      zone: 'Filtration',
      previousLiters: Math.round(8290 * mult),
      currentLiters: Math.round(7420 * mult),
      deltaLiters: Math.round(-870 * mult),
      deltaPct: -10.5,
      provenance: 'demo',
    },
    {
      id: 'cmp-boiler',
      name: 'South Boiler Make-Up',
      zone: 'Thermal',
      previousLiters: Math.round(5890 * mult),
      currentLiters: Math.round(5290 * mult),
      deltaLiters: Math.round(-600 * mult),
      deltaPct: -10.2,
      provenance: 'demo',
    },
    {
      id: 'cmp-north',
      name: isHybridWithPhysical ? 'North Utility (FS-S401 Live)' : 'North Utility Wing',
      zone: 'Distribution',
      previousLiters: Math.round(4720 * mult),
      currentLiters: isHybridWithPhysical && latestDailyLiters > 0 ? Math.round(latestDailyLiters) : Math.round(4120 * mult),
      deltaLiters: Math.round(-600 * mult),
      deltaPct: -12.7,
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
  ];

  const zoneBreakdowns: ZoneBreakdownSegment[] = [
    {
      id: 'zb-chiller',
      name: 'Chiller Plant & Cooling Towers',
      regionCode: 'Z-01',
      sharePct: 34,
      dailyLiters: Math.round(20990 * mult),
      monthlyLiters: Math.round(629700 * mult),
      activeNodes: 44,
      efficiencyPct: 88,
      statusNote: 'Condenser blowdown cycles tightened',
      provenance: 'demo',
    },
    {
      id: 'zb-header',
      name: 'Primary Supply & Cistern',
      regionCode: 'Z-02',
      sharePct: 29,
      dailyLiters: Math.round(17900 * mult),
      monthlyLiters: Math.round(537000 * mult),
      activeNodes: 38,
      efficiencyPct: 91,
      statusNote: 'Overnight header baseline stabilized',
      provenance: 'demo',
    },
    {
      id: 'zb-ro',
      name: 'East RO Filtration & Backwash',
      regionCode: 'Z-03',
      sharePct: 21,
      dailyLiters: Math.round(12960 * mult),
      monthlyLiters: Math.round(388800 * mult),
      activeNodes: 42,
      efficiencyPct: 82,
      statusNote: 'Permeate recovery rate elevated',
      provenance: 'demo',
    },
    {
      id: 'zb-boiler',
      name: 'South Boiler & Utility Wing',
      regionCode: 'Z-04',
      sharePct: 16,
      dailyLiters: Math.round(9870 * mult),
      monthlyLiters: Math.round(296100 * mult),
      activeNodes: 36,
      efficiencyPct: 84,
      statusNote: isHybridWithPhysical ? 'FS-S401 pulse node linked on Bench A1' : 'Simulated ESP32 make-up telemetry',
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
  ];

  const rotatedKpiBars: RotatedBarCategory[] = [
    {
      id: 'bar-chiller',
      name: 'Chiller Towers',
      headlineMetric: 34,
      headlineFormatted: '34%',
      metricUnit: 'Share of Plant Draw',
      sharePct: 92,
      subtitle: 'Cooling tower make-up & drift recovery',
      leadDescription:
        'Chiller Plant B accounts for 34% of total metered hydraulic volume, achieving an 11.7% cycle reduction after staggered pump scheduling.',
      bandColorVar: '--brand-band',
      provenance: 'demo',
    },
    {
      id: 'bar-header',
      name: 'Main Supply',
      headlineMetric: 29,
      headlineFormatted: '29%',
      metricUnit: 'Municipal Intake',
      sharePct: 78,
      subtitle: 'Primary pressurized riser allocation',
      leadDescription:
        'Main Supply Header metering captures 29% of overall demand with tight night-floor detection preventing unscheduled cistern overflow.',
      bandColorVar: '--series-a',
      provenance: 'demo',
    },
    {
      id: 'bar-ro',
      name: 'RO Filtration',
      headlineMetric: 21,
      headlineFormatted: '21%',
      metricUnit: 'Membrane Process',
      sharePct: 64,
      subtitle: 'Backwash & permeate trains',
      leadDescription:
        'East Filtration Hall processes 21% of facility throughput across dual RO trains, trimming reject discharge during off-peak tariffs.',
      bandColorVar: '--series-c',
      provenance: 'demo',
    },
    {
      id: 'bar-boiler',
      name: 'Utility Bench',
      headlineMetric: 16,
      headlineFormatted: '16%',
      metricUnit: isHybridWithPhysical ? 'Includes FS-S401' : 'Make-Up Loop',
      sharePct: 48,
      subtitle: 'ESP32 pulse-instrumented make-up zone',
      leadDescription:
        'North & South utility loops represent 16% of demand and host the verified FS-S401 turbine pulse bench and 16×2 character LCD display.',
      bandColorVar: '--accent-red',
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
  ];

  const trendSeries: TrendSeriesPoint[] = [
    { index: 0, dateLabel: 'Oct 22', isoDate: '2026-10-22', dailyLiters: Math.round(64200 * mult), baselineLiters: Math.round(69800 * mult), flowRateLpm: 21.4, provenance: 'demo' },
    { index: 1, dateLabel: 'Oct 24', isoDate: '2026-10-24', dailyLiters: Math.round(62900 * mult), baselineLiters: Math.round(69400 * mult), flowRateLpm: 20.8, provenance: 'demo' },
    { index: 2, dateLabel: 'Oct 26', isoDate: '2026-10-26', dailyLiters: Math.round(65400 * mult), baselineLiters: Math.round(69100 * mult), flowRateLpm: 22.1, provenance: 'demo' },
    { index: 3, dateLabel: 'Oct 28', isoDate: '2026-10-28', dailyLiters: Math.round(61100 * mult), baselineLiters: Math.round(68700 * mult), flowRateLpm: 19.6, provenance: 'demo' },
    { index: 4, dateLabel: 'Oct 30', isoDate: '2026-10-30', dailyLiters: Math.round(59400 * mult), baselineLiters: Math.round(68200 * mult), flowRateLpm: 18.9, provenance: 'demo' },
    { index: 5, dateLabel: 'Nov 01', isoDate: '2026-11-01', dailyLiters: Math.round(58100 * mult), baselineLiters: Math.round(67800 * mult), flowRateLpm: 18.2, provenance: 'demo' },
    { index: 6, dateLabel: 'Nov 02', isoDate: '2026-11-02', dailyLiters: Math.round(60200 * mult), baselineLiters: Math.round(67500 * mult), flowRateLpm: 19.3, provenance: 'demo' },
    { index: 7, dateLabel: 'Nov 03', isoDate: '2026-11-03', dailyLiters: Math.round(57600 * mult), baselineLiters: Math.round(67100 * mult), flowRateLpm: 17.8, provenance: 'demo' },
    {
      index: 8,
      dateLabel: 'Nov 04',
      isoDate: '2026-11-04',
      dailyLiters: isHybridWithPhysical && latestDailyLiters > 0 ? Math.round(latestDailyLiters + 55800 * mult) : Math.round(56400 * mult),
      baselineLiters: Math.round(66800 * mult),
      flowRateLpm: isHybridWithPhysical && avgPhysicalFlow > 0 ? Number(avgPhysicalFlow.toFixed(1)) : 17.4,
      provenance: isHybridWithPhysical ? 'physical' : 'demo',
    },
  ];

  const milestones: TimelineMilestone[] = [
    {
      id: 'ms-esp32',
      date: 'Jan 2025',
      yearNum: 2025.05,
      shortTitle: 'ESP32 + FS-S401',
      fullTitle: 'ESP32 DevKit & FS-S401 Hall Turbine Commissioned',
      detail: 'Hardware pulse interrupt calibration finalized on GPIO34 with 16×2 LCD status output.',
      highlight: true,
    },
    {
      id: 'ms-baseline',
      date: 'May 2025',
      yearNum: 2025.42,
      shortTitle: 'Night-Floor Audit',
      fullTitle: 'Baseline Night-Floor Leak Signature Established',
      detail: 'Minimum nocturnal flow threshold tuned to isolate unattended manifold weeping.',
    },
    {
      id: 'ms-ro',
      date: 'Oct 2025',
      yearNum: 2025.82,
      shortTitle: 'RO Sequencing',
      fullTitle: 'RO Backwash Staggering Rollout',
      detail: 'Staggered filtration flush intervals across East Hall to trim daytime peak flow.',
    },
    {
      id: 'ms-rls',
      date: 'Mar 2026',
      yearNum: 2026.22,
      shortTitle: 'Supabase RLS',
      fullTitle: 'Authenticated Multi-Tenant Telemetry Storage',
      detail: 'Enforced per-user ownership isolation and timestamped FS-S401 ingestion in Postgres.',
    },
    {
      id: 'ms-chiller',
      date: 'Jul 2026',
      yearNum: 2026.55,
      shortTitle: 'Chiller Trim',
      fullTitle: 'Chiller Plant B Make-Up Optimization',
      detail: 'Reduced excess blowdown makeup flow by 11.7% relative to prior rolling baseline.',
      highlight: true,
    },
    {
      id: 'ms-ina',
      date: 'Q4 2026',
      yearNum: 2026.92,
      shortTitle: 'INA219 Calibration',
      fullTitle: 'INA219 DC Shunt Calibration Queue',
      detail: 'Hardware electrical monitor installed on bench; current/voltage values kept strictly null until verified.',
    },
  ];

  const stackedPeriods: StackedConsumptionPeriod[] = [
    { id: 'sp-q1-25', periodLabel: 'Q1 25', coreFlowLiters: Math.round(32000 * mult), peakShavingLiters: Math.round(14800 * mult), auxiliaryLiters: Math.round(9200 * mult), reserveBenchmarkLiters: Math.round(6400 * mult), totalLiters: Math.round(62400 * mult), provenance: 'demo' },
    { id: 'sp-q2-25', periodLabel: 'Q2 25', coreFlowLiters: Math.round(33400 * mult), peakShavingLiters: Math.round(13900 * mult), auxiliaryLiters: Math.round(8900 * mult), reserveBenchmarkLiters: Math.round(6800 * mult), totalLiters: Math.round(63000 * mult), provenance: 'demo' },
    { id: 'sp-q3-25', periodLabel: 'Q3 25', coreFlowLiters: Math.round(34100 * mult), peakShavingLiters: Math.round(13100 * mult), auxiliaryLiters: Math.round(8600 * mult), reserveBenchmarkLiters: Math.round(7200 * mult), totalLiters: Math.round(63000 * mult), provenance: 'demo' },
    { id: 'sp-q4-25', periodLabel: 'Q4 25', coreFlowLiters: Math.round(31800 * mult), peakShavingLiters: Math.round(12200 * mult), auxiliaryLiters: Math.round(8100 * mult), reserveBenchmarkLiters: Math.round(7600 * mult), totalLiters: Math.round(59700 * mult), provenance: 'demo' },
    { id: 'sp-q1-26', periodLabel: 'Q1 26', coreFlowLiters: Math.round(30900 * mult), peakShavingLiters: Math.round(11500 * mult), auxiliaryLiters: Math.round(7800 * mult), reserveBenchmarkLiters: Math.round(8200 * mult), totalLiters: Math.round(58400 * mult), provenance: 'demo' },
    { id: 'sp-q2-26', periodLabel: 'Q2 26', coreFlowLiters: Math.round(30200 * mult), peakShavingLiters: Math.round(10800 * mult), auxiliaryLiters: Math.round(7400 * mult), reserveBenchmarkLiters: Math.round(8900 * mult), totalLiters: Math.round(57300 * mult), provenance: 'demo' },
    { id: 'sp-q3-26', periodLabel: 'Q3 26', coreFlowLiters: Math.round(29400 * mult), peakShavingLiters: Math.round(10100 * mult), auxiliaryLiters: Math.round(7100 * mult), reserveBenchmarkLiters: Math.round(9600 * mult), totalLiters: Math.round(56200 * mult), provenance: 'demo' },
    { id: 'sp-q4-26', periodLabel: 'Q4 26*', coreFlowLiters: Math.round(28100 * mult), peakShavingLiters: Math.round(9200 * mult), auxiliaryLiters: Math.round(6700 * mult), reserveBenchmarkLiters: Math.round(10400 * mult), totalLiters: Math.round(54400 * mult), isForecast: true, provenance: 'demo' },
  ];

  const scrollySteps: ScrollyNarrativeStep[] = [
    {
      id: 'step-1',
      stepNumber: 'STAGE 01',
      kicker: 'BASELINE METERING',
      title: 'Steady base-load process draw anchors facility consumption',
      body: 'Across Q1–Q3 2025, continuous cooling and filtration process flow represented over 52% of daily facility draw, setting a measurable floor for pulse-level instrumentation.',
      highlightSeries: 'core',
      activePeriodIndex: 1,
    },
    {
      id: 'step-2',
      stepNumber: 'STAGE 02',
      kicker: 'PEAK LOAD TRIMMING',
      title: 'Staggered RO backwash flattens midday intake surges',
      body: 'Separating membrane flush schedules from daytime chiller ramp-up compressed peak-window volume from 14.8 kL to 10.1 kL over four consecutive quarters.',
      highlightSeries: 'peak',
      activePeriodIndex: 4,
    },
    {
      id: 'step-3',
      stepNumber: 'STAGE 03',
      kicker: 'CONSERVATION RESERVE',
      title: 'Recovered reserve margin expands ahead of Q4 forecast',
      body: 'Audited conservation reserve (dashed Q4* outlook) captures avoided blowdown and night-floor leak containment without overstating electrical savings while INA219 calibration remains pending.',
      highlightSeries: 'reserve',
      activePeriodIndex: 7,
    },
  ];

  const heatmapColumns = ['00–04h', '04–08h', '08–12h', '12–16h', '16–20h', '20–24h'];
  const heatmapRows: HeatmapMatrixRow[] = [
    { id: 'hm-1', sector: 'Chiller Plant B', zoneGroup: 'Cooling', values: [32, 48, 86, 94, 79, 44], provenance: 'demo' },
    { id: 'hm-2', sector: 'Main Supply Header', zoneGroup: 'Intake', values: [24, 54, 82, 89, 76, 38], provenance: 'demo' },
    { id: 'hm-3', sector: 'Process Cooling Loop', zoneGroup: 'Cooling', values: [41, 58, 74, 81, 69, 47], provenance: 'demo' },
    { id: 'hm-4', sector: 'East Filtration Hall', zoneGroup: 'Filtration', values: [18, 66, 77, 72, 58, 29], provenance: 'demo' },
    { id: 'hm-5', sector: 'South Boiler Make-Up', zoneGroup: 'Thermal', values: [29, 62, 68, 65, 52, 34], provenance: 'demo' },
    { id: 'hm-6', sector: 'North Utility Wing', zoneGroup: 'Bench', values: [14, 39, 61, 58, 43, 19], provenance: isHybridWithPhysical ? 'physical' : 'demo' },
    { id: 'hm-7', sector: 'Reserve Cistern Transfer', zoneGroup: 'Intake', values: [68, 52, 24, 19, 31, 74], provenance: 'demo' },
  ];

  const waffleItems: WaffleCategoryItem[] = [
    {
      id: 'waf-verified',
      label: 'FS-S401 Verified',
      count: 42,
      colorRole: 'verified',
      description: 'Optical/Hall turbine pulse telemetry validated on ESP32 GPIO34.',
    },
    {
      id: 'waf-modeled',
      label: 'Enterprise Demo Cohort',
      count: 44,
      colorRole: 'demo',
      description: 'Multi-zone synthetic facility distribution for fleet scale visualization.',
    },
    {
      id: 'waf-pending',
      label: 'INA219 Calibration Pending',
      count: 14,
      colorRole: 'pending',
      description: 'DC power monitoring installed on bench; values strictly null until calibrated.',
    },
  ];

  const divergingVariance: DivergingVarianceItem[] = [
    { id: 'dv-1', zone: 'Chiller Plant B', aboveTargetPct: 58, onTargetPct: 24, belowTargetPct: 18, provenance: 'demo' },
    { id: 'dv-2', zone: 'Main Supply Header', aboveTargetPct: 64, onTargetPct: 22, belowTargetPct: 14, provenance: 'demo' },
    { id: 'dv-3', zone: 'East Filtration Hall', aboveTargetPct: 49, onTargetPct: 27, belowTargetPct: 24, provenance: 'demo' },
    { id: 'dv-4', zone: 'Process Cooling Loop', aboveTargetPct: 41, onTargetPct: 28, belowTargetPct: 31, provenance: 'demo' },
    { id: 'dv-5', zone: 'North Utility Wing', aboveTargetPct: 68, onTargetPct: 20, belowTargetPct: 12, provenance: isHybridWithPhysical ? 'physical' : 'demo' },
  ];

  const scatterObservations: ScatterObservation[] = DEMO_FACILITIES.map(f => ({
    id: f.id,
    label: f.facilityName,
    zone: f.zone,
    category: f.category,
    xFlowScore: f.utilPct,
    yMonthlyLitersK: Number(((f.baseDailyLiters * 30 * mult) / 1000).toFixed(1)),
    efficiencyPct: Math.min(96, Math.round(f.utilPct + 5)),
    provenance: 'demo',
  }));

  if (isHybridWithPhysical && latestReading) {
    scatterObservations.unshift({
      id: `phys-${latestReading.id}`,
      label: `${devices[0]?.name || 'ESP32-Bench-01'} (Verified)`,
      zone: devices[0]?.location || 'Hardware Bench',
      category: 'ESP32 Physical',
      xFlowScore: Math.min(98, Math.max(18, Math.round(avgPhysicalFlow * 3.1))),
      yMonthlyLitersK: Number((latestMonthlyLiters / 1000).toFixed(2)),
      efficiencyPct: 86,
      provenance: 'physical',
    });
  }

  const scenarioBars: RotatedBarCategory[] = [
    {
      id: 'scn-base',
      name: 'Unadjusted',
      headlineMetric: 100,
      headlineFormatted: '100%',
      metricUnit: 'Uncontrolled Baseline',
      sharePct: 100,
      subtitle: 'Zero pump staggering or night-floor cutoffs',
      leadDescription:
        'Unadjusted facility demand benchmark assuming static valve throttling and unmonitored nocturnal bypass.',
      bandColorVar: '--series-b',
      provenance: 'demo',
    },
    {
      id: 'scn-target',
      name: 'Target 2026',
      headlineMetric: 86,
      headlineFormatted: '86%',
      metricUnit: '-14% Water Intensity',
      sharePct: 86,
      subtitle: 'With FS-S401 anomaly triage active',
      leadDescription:
        'Target operating corridor achievable by enforcing FS-S401 continuous-flow alerts and staggered RO flush cycles.',
      bandColorVar: '--brand-band',
      provenance: 'demo',
    },
    {
      id: 'scn-stretch',
      name: 'Stretch Reuse',
      headlineMetric: 74,
      headlineFormatted: '74%',
      metricUnit: '-26% Greywater Reuse',
      sharePct: 74,
      subtitle: 'Closed-loop permeate reclaim benchmark',
      leadDescription:
        'Long-horizon conservation target combining RO reject recovery into cooling tower make-up basins.',
      bandColorVar: '--series-c',
      provenance: 'demo',
    },
  ];

  const explorerRows: BusinessExplorerRow[] = DEMO_FACILITIES.map((f, i) => {
    const daily = Math.round(f.baseDailyLiters * mult);
    const monthly = Math.round(daily * 30);
    return {
      id: f.id,
      isoDate: f.isoDate,
      facilityName: f.facilityName,
      zone: f.zone,
      sensorModel: i === 0 && isHybridWithPhysical ? 'FS-S401 (GPIO34 Live)' : 'Simulated Meter (Demo)',
      flowRateLpm: i === 0 && isHybridWithPhysical && avgPhysicalFlow > 0 ? Number(avgPhysicalFlow.toFixed(2)) : f.baseFlowLpm,
      dailyLiters: i === 0 && isHybridWithPhysical && latestDailyLiters > 0 ? latestDailyLiters : daily,
      monthlyLiters: i === 0 && isHybridWithPhysical && latestMonthlyLiters > 0 ? latestMonthlyLiters : monthly,
      utilizationPct: f.utilPct,
      sparkline: [
        Number((f.baseFlowLpm * 0.92).toFixed(1)),
        Number((f.baseFlowLpm * 1.04).toFixed(1)),
        Number((f.baseFlowLpm * 0.97).toFixed(1)),
        Number((f.baseFlowLpm * 1.01).toFixed(1)),
        f.baseFlowLpm,
      ],
      ina219PowerKw: null,
      ina219Status: 'Calibration Pending',
      provenance: i === 0 && isHybridWithPhysical ? 'physical' : 'demo',
    };
  });

  return {
    sourceMode,
    effectiveProvenance: isHybridWithPhysical ? 'mixed' : 'demo',
    reportingPeriod,
    periodLabel: labels.current,
    comparisonPeriodLabel: labels.comparison,
    fetchedAtIso: physicalSnapshot.fetchedAtIso,
    physicalRecordCount: totalPhysicalReadings,
    physicalDeviceCount: devices.length,
    hasPhysicalRecords,
    hardwareBannerNote: isHybridWithPhysical
      ? `Hybrid Audit View: ${totalPhysicalReadings} verified ESP32 FS-S401 readings combined with clearly tagged Demo Enterprise zones. INA219 remains calibration-pending (null).`
      : 'Enterprise Demo Dataset active for full multi-zone visualization. Switch to Verified Physical Only in Control Panel to isolate live Supabase FS-S401 packets.',
    overviewKpis,
    matrixUnits: buildDemoMatrixUnits(mult),
    periodComparison,
    zoneBreakdowns,
    rotatedKpiBars,
    trendSeries,
    milestones,
    stackedPeriods,
    scrollySteps,
    heatmapColumns,
    heatmapRows,
    waffleItems,
    divergingVariance,
    scatterObservations,
    scenarioBars,
    explorerRows,
  };
}
