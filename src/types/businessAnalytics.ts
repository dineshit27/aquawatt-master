export type BusinessDataSourceMode = 'hybrid' | 'physical' | 'demo';
export type ReportingPeriodId = '7d' | '30d' | '90d';
export type FolioPaletteId = 'aquawatt' | 'swiss' | 'ivory' | 'forest' | 'terracotta' | 'dark';

export type DataProvenance = 'physical' | 'demo';

export interface ProvenanceBadgeInfo {
  provenance: DataProvenance;
  label: string;
  detail: string;
}

export interface KpiStatItem {
  id: string;
  label: string;
  value: string;
  unit: string;
  note: string;
  provenance: DataProvenance;
}

export type MatrixGroupKey = 'all' | 'zone' | 'tier' | 'sensor';

export interface MatrixUnit {
  id: string;
  index: number;
  label: string;
  zone: string;
  tier: string;
  sensorRole: 'FS-S401 Flow' | '16x2 LCD Relay' | 'INA219 Pending' | 'Simulated Meter';
  dailyLiters: number;
  efficiencyPct: number;
  provenance: DataProvenance;
}

export interface PeriodDumbbellItem {
  id: string;
  name: string;
  zone: string;
  previousLiters: number;
  currentLiters: number;
  deltaLiters: number;
  deltaPct: number;
  provenance: DataProvenance;
}

export interface ZoneBreakdownSegment {
  id: string;
  name: string;
  regionCode: string;
  sharePct: number;
  dailyLiters: number;
  monthlyLiters: number;
  activeNodes: number;
  efficiencyPct: number;
  statusNote: string;
  provenance: DataProvenance;
}

export interface RotatedBarCategory {
  id: string;
  name: string;
  headlineMetric: number;
  headlineFormatted: string;
  metricUnit: string;
  sharePct: number;
  subtitle: string;
  leadDescription: string;
  bandColorVar: '--brand-band' | '--series-a' | '--series-c' | '--series-b' | '--accent-red';
  provenance: DataProvenance;
}

export interface TrendSeriesPoint {
  index: number;
  dateLabel: string;
  isoDate: string;
  dailyLiters: number;
  baselineLiters: number;
  flowRateLpm: number;
  provenance: DataProvenance;
}

export interface TimelineMilestone {
  id: string;
  date: string;
  yearNum: number;
  shortTitle: string;
  fullTitle: string;
  detail: string;
  highlight?: boolean;
  tier?: number;
}

export interface StackedConsumptionPeriod {
  id: string;
  periodLabel: string;
  coreFlowLiters: number;
  peakShavingLiters: number;
  auxiliaryLiters: number;
  reserveBenchmarkLiters: number;
  totalLiters: number;
  isForecast?: boolean;
  provenance: DataProvenance;
}

export interface ScrollyNarrativeStep {
  id: string;
  stepNumber: string;
  kicker: string;
  title: string;
  body: string;
  highlightSeries: 'all' | 'core' | 'peak' | 'aux' | 'reserve';
  activePeriodIndex: number;
}

export interface HeatmapMatrixRow {
  id: string;
  sector: string;
  zoneGroup: string;
  values: number[]; // utilization or conservation index across 6 time/zone columns (0-100)
  provenance: DataProvenance;
}

export interface WaffleCategoryItem {
  id: string;
  label: string;
  count: number; // out of 100 tiles
  colorRole: 'verified' | 'demo' | 'pending';
  description: string;
}

export interface DivergingVarianceItem {
  id: string;
  zone: string;
  aboveTargetPct: number; // positive conservation / surplus efficiency %
  onTargetPct: number;    // neutral tolerance band %
  belowTargetPct: number; // over-baseline / excess draw %
  provenance: DataProvenance;
}

export type ScatterCategory = 'Continuous Process' | 'Cooling Loop' | 'Municipal Supply' | 'ESP32 Physical';

export interface ScatterObservation {
  id: string;
  label: string;
  zone: string;
  category: ScatterCategory;
  xFlowScore: number;        // 0 - 100 Flow Stability / Utilization Index
  yMonthlyLitersK: number;   // Monthly Water Volume in Thousands of Liters (kL)
  efficiencyPct: number;
  provenance: DataProvenance;
}

export interface OLSRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  sampleSize: number;
  meanX: number;
  meanY: number;
}

export interface BusinessExplorerRow {
  id: string;
  isoDate: string;
  facilityName: string;
  zone: string;
  sensorModel: string;
  flowRateLpm: number;
  dailyLiters: number;
  monthlyLiters: number;
  utilizationPct: number;
  sparkline: number[];
  ina219PowerKw: number | null;
  ina219Status: 'Calibration Pending';
  provenance: DataProvenance;
}

export interface BusinessAnalyticsDataset {
  sourceMode: BusinessDataSourceMode;
  effectiveProvenance: DataProvenance | 'mixed';
  reportingPeriod: ReportingPeriodId;
  periodLabel: string;
  comparisonPeriodLabel: string;
  fetchedAtIso: string;
  physicalRecordCount: number;
  physicalDeviceCount: number;
  hasPhysicalRecords: boolean;
  hardwareBannerNote: string;
  overviewKpis: KpiStatItem[];
  matrixUnits: MatrixUnit[];
  periodComparison: PeriodDumbbellItem[];
  zoneBreakdowns: ZoneBreakdownSegment[];
  rotatedKpiBars: RotatedBarCategory[];
  trendSeries: TrendSeriesPoint[];
  milestones: TimelineMilestone[];
  stackedPeriods: StackedConsumptionPeriod[];
  scrollySteps: ScrollyNarrativeStep[];
  heatmapColumns: string[];
  heatmapRows: HeatmapMatrixRow[];
  waffleItems: WaffleCategoryItem[];
  divergingVariance: DivergingVarianceItem[];
  scatterObservations: ScatterObservation[];
  scenarioBars: RotatedBarCategory[];
  explorerRows: BusinessExplorerRow[];
}
