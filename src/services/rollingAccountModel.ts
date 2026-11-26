import type { BusinessDataSourceMode } from '../types/businessAnalytics';
import type { PhysicalSupabaseSnapshot } from './businessAnalyticsService';
import { DEFAULT_INR_WATER_RATE } from '../utils/calculations';

export const DAY_MS = 86_400_000;

export function getTodayUtc(): number {
  const localToday = new Date();
  return Date.UTC(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());
}

export function monthsBefore(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay));
}

export interface DayInfo {
  y: number;
  m: number;
  d: number;
  dow: number;
}

export interface FacilityMilestone {
  day: number;
  name: string;
  rank: number;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const COHORTS = [
  {
    id: 0,
    label: 'Cooling Loops',
    one: 'Cooling Loop',
    note: 'Condenser towers and chiller make-up headers with elevated daytime evaporative draw.',
  },
  {
    id: 1,
    label: 'Process Trains',
    one: 'Process Train',
    note: 'RO permeate skids, membrane backwash, and boiler feedwater treatment lines.',
  },
  {
    id: 2,
    label: 'Municipal Mains',
    one: 'Municipal Main',
    note: 'Primary intake headers, reserve cistern transfer, and nocturnal floor monitors.',
  },
  {
    id: 3,
    label: 'ESP32 + FS-S401',
    one: 'ESP32 + FS-S401',
    note: 'Live GPIO34 Hall-turbine pulse meters with local 16x2 LCD verification (INA219 pending).',
  },
] as const;

export const OPERATIONAL_DRIVERS = [
  { label: 'Chiller Make-Up', note: 'Evaporative cooling tower bleed and thermal make-up flow.' },
  { label: 'RO Permeate & Flush', note: 'Membrane filtration production and scheduled backwash intervals.' },
  { label: 'Boiler Feedwater', note: 'Softened make-up and condensate return replenishment.' },
  { label: 'Header Transfer', note: 'Municipal intake to elevated cistern equalization runs.' },
  { label: 'Clean-in-Place', note: 'Batch sanitation and manifold rinse cycles.' },
  { label: 'Night-Floor Leak Watch', note: 'Unscheduled 00:00–05:00 baseline draw above nominal floor.' },
  { label: 'Bench Flow Checks', note: 'FS-S401 turbine calibration and manifold validation runs.' },
  { label: 'Auxiliary Risers', note: 'Utility washdown and perimeter irrigation supply.' },
] as const;

export const COST_CATEGORIES = [
  { label: 'Municipal Volumetric', note: 'Standard slab intake tariff at ₹25 per kiloliter.' },
  { label: 'Cooling Make-Up', note: 'Chiller loop replenishment charged under daytime demand tariff.' },
  { label: 'RO Reject & Flush', note: 'Concentrate discharge and backwash recovery overhead.' },
  { label: 'Over-Cap Surcharge', note: 'Excess tier penalty triggered when daily cap ceiling is exceeded.' },
  { label: 'Boiler Treatment', note: 'Demineralized make-up conditioning and blowdown replacement.' },
  { label: 'Night-Floor Waste', note: 'Estimated cost of off-hours weeping prior to valve isolation.' },
] as const;

export const SUBSYSTEM_GROUPS = [
  { label: 'Towers', note: 'Cooling Tower B & Condenser Header C2 recovery volume.' },
  { label: 'RO Skids', note: 'Permeate reclaim & membrane backwash recovery.' },
  { label: 'Mains', note: 'Municipal intake pressure-balanced savings.' },
  { label: 'Boilers', note: 'Condensate return & softener optimization.' },
  { label: 'Bench', note: 'FS-S401 ESP32 instrumented conservation loop.' },
] as const;

export type RollingMetricId = 'intake' | 'excess' | 'cost' | 'reclaimed';
export const ROLLING_METRIC_ORDER: RollingMetricId[] = ['intake', 'excess', 'cost', 'reclaimed'];

export interface MetricPart {
  n: string;
  u?: string;
  gap?: boolean;
}

export type MeterStanding = 'optimal' | 'watch' | 'overcap' | 'idle';

export interface RollingPair {
  cur: number;
  prev: number;
}

export interface RollingSlice extends RollingPair {
  id: number;
  label: string;
  note: string;
}

export interface FacilityMeterRow {
  id: number | string;
  name: string;
  wing: string;
  cohort: number;
  capLitersDay: number;
  intakeLiters: number;
  capTotalLiters: number;
  adherenceRatio: number | null;
  costInr: number;
  reclaimedLiters: number;
  standing: MeterStanding;
  provenance: 'physical' | 'demo';
}

export interface RollingTimelineCalendar {
  today: number;
  todayIso: string;
  reportYear: number;
  epoch: number;
  firstDay: number;
  lastDay: number;
  totalDays: number;
  yearDays: number;
  days: DayInfo[];
  twin: Int32Array;
  milestones: FacilityMilestone[];
  milestoneByDay: Map<number, string>;
  monthStarts: { off: number; m: number; y: number }[];
  presets: { id: string; label: string; from: number; to: number; hint: string }[];
}

export interface RollingDatasetStore {
  calendar: RollingTimelineCalendar;
  cohortCounts: number[];
  totalNodes: number;
  provenance: 'physical' | 'mixed' | 'demo';
  emptyPhysicalReason: string | null;
  series: {
    cap: Float64Array[];
    intake: Float64Array[];
    excess: Float64Array[];
    cost: Float64Array[];
    reclaimed: Float64Array[];
    driver: Float64Array[][];
    costCat: Float64Array[][];
    subsystem: Float64Array[][];
  };
  nodes: {
    id: number | string;
    name: string;
    wing: string;
    cohort: number;
    capLitersDay: number;
    provenance: 'physical' | 'demo';
    cap: Float64Array;
    intake: Float64Array;
    cost: Float64Array;
    reclaimed: Float64Array;
  }[];
}

export interface RollingAccountView {
  from: number;
  to: number;
  days: number;
  totals: Record<RollingMetricId, RollingPair>;
  capTotal: RollingPair;
  rolling: Record<RollingMetricId, { cur: number[]; prev: number[] }>;
  drivers: RollingSlice[];
  costCategories: RollingSlice[];
  subsystems: RollingSlice[];
  rows: FacilityMeterRow[];
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function fmtPct(x: number): string {
  const v = Math.abs(x) * 100;
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)}%`;
}

export function signedPct(cur: number, prev: number): string {
  return prev > 0 ? `${cur >= prev ? '+' : '−'}${fmtPct((cur - prev) / prev)}` : '—';
}

export function fmtLitersParts(liters: number): MetricPart[] {
  const v = Math.max(0, Math.round(liters));
  if (v >= 1_000_000) {
    return [{ n: (v / 1_000_000).toFixed(2), u: 'ML', gap: true }];
  }
  if (v >= 10_000) {
    return [{ n: (v / 1_000).toFixed(1), u: 'kL', gap: true }];
  }
  return [{ n: fmtInt(v), u: 'L', gap: true }];
}

export function fmtLitersShort(liters: number): string {
  const v = Math.max(0, Math.round(liters));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} ML`;
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)} kL`;
  return `${fmtInt(v)} L`;
}

export function fmtLitersAxis(liters: number): string {
  const v = Math.round(liters);
  if (v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

export function fmtInrParts(inr: number): MetricPart[] {
  const v = Math.max(0, Math.round(inr));
  if (v >= 100_000) {
    return [{ n: `₹${(v / 100_000).toFixed(2)}`, u: 'L', gap: true }];
  }
  return [{ n: `₹${fmtInt(v)}` }];
}

export function fmtInrShort(inr: number): string {
  const v = Math.max(0, Math.round(inr));
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(2)} L`;
  return `₹${fmtInt(v)}`;
}

export function fmtInrAxis(inr: number): string {
  const v = Math.round(inr);
  if (v === 0) return '₹0';
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${Math.round(v / 1_000)}k`;
  return `₹${v}`;
}

export function niceTicks(max: number, count = 5): number[] {
  const m = Math.max(1, max);
  const raw = m / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = Math.max(1, Math.round((norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag));
  const out: number[] = [];
  for (let v = 0; ; v += step) {
    out.push(v);
    if (v >= m) break;
  }
  return out;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function resample(src: number[], n: number): number[] {
  if (src.length === n) return src;
  const out = new Array<number>(n).fill(0);
  if (src.length === 0 || n === 0) return out;
  if (n === 1 || src.length === 1) return out.fill(src[src.length - 1]);
  const k = (src.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const p = i * k;
    const j = Math.floor(p);
    out[i] = j + 1 < src.length ? src[j] + (src[j + 1] - src[j]) * (p - j) : src[src.length - 1];
  }
  return out;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function linePath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return '';
  let p = `M${r1(xs[0])},${r1(ys[0])}`;
  if (n === 1) return p;

  if (n > 150) {
    for (let i = 1; i < n; i++) p += `L${r1(xs[i])},${r1(ys[i])}`;
    return p;
  }

  const d = new Array<number>(n - 1);
  const m = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const h = (xs[i + 1] - xs[i]) / 3;
    p += `C${r1(xs[i] + h)},${r1(ys[i] + m[i] * h)} ${r1(xs[i + 1] - h)},${r1(ys[i + 1] - m[i + 1] * h)} ${r1(xs[i + 1])},${r1(ys[i + 1])}`;
  }
  return p;
}

export interface LabelIn {
  x: number;
  label: string;
  rank: number;
}

export interface LabelOut extends LabelIn {
  anchor: 'start' | 'middle' | 'end';
  dx: number;
}

export function placeLabels(items: LabelIn[], width: number, charWidth = 6.2, pad = 8): LabelOut[] {
  const boxes: [number, number][] = [];
  const out: LabelOut[] = [];
  const clear = (x0: number, w: number) => !boxes.some(([a, b]) => x0 < b + pad && x0 + w > a - pad);

  for (const it of [...items].sort((a, b) => a.rank - b.rank || a.x - b.x)) {
    const w = it.label.length * charWidth;
    let anchor: LabelOut['anchor'] = 'middle';
    let x0 = it.x - w / 2;
    if (x0 < 0) {
      anchor = 'start';
      x0 = 0;
    } else if (x0 + w > width) {
      anchor = 'end';
      x0 = width - w;
    }

    let dx = 0;
    if (!clear(x0, w)) {
      const nudge =
        anchor === 'middle'
          ? [-6, 6, -12, 12].find((d) => x0 + d >= 0 && x0 + d + w <= width && clear(x0 + d, w))
          : undefined;
      if (nudge === undefined) continue;
      dx = nudge;
    }
    boxes.push([x0 + dx, x0 + dx + w]);
    out.push({ ...it, anchor, dx });
  }
  return out;
}

export function createRollingCalendar(todayUtc = getTodayUtc()): RollingTimelineCalendar {
  const todayDate = new Date(todayUtc);
  const reportYear = todayDate.getUTCFullYear();
  const todayIso = todayDate.toISOString().slice(0, 10);
  const epoch = monthsBefore(todayUtc, 24) - 28 * DAY_MS;

  const indexOfDate = (ts: number) => Math.round((ts - epoch) / DAY_MS);
  const dayIndex = (y: number, m: number, d: number) => indexOfDate(Date.UTC(y, m - 1, d));
  const trailingStart = (months: number) => indexOfDate(monthsBefore(todayUtc, months)) + 1;

  const firstDay = trailingStart(12);
  const lastDay = indexOfDate(todayUtc);
  const totalDays = lastDay + 1;
  const yearDays = lastDay - firstDay + 1;

  const days: DayInfo[] = Array.from({ length: totalDays }, (_, i) => {
    const t = new Date(epoch + i * DAY_MS);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  });

  const years = [...new Set(days.map(({ y }) => y))];
  const twin = Int32Array.from(days, (_, i) => indexOfDate(monthsBefore(epoch + i * DAY_MS, 12)));

  const milestoneSpecs: { m: number; d: number; name: string; rank: number }[] = [
    { m: 1, d: 1, name: 'Q1 Tariff Reset', rank: 1 },
    { m: 2, d: 15, name: 'Dry Baseline', rank: 2 },
    { m: 3, d: 25, name: 'FS-S401 Calib', rank: 1 },
    { m: 5, d: 15, name: 'Chiller Ramp', rank: 2 },
    { m: 6, d: 24, name: 'Summer Peak', rank: 1 },
    { m: 8, d: 1, name: 'Monsoon Shift', rank: 2 },
    { m: 9, d: 29, name: 'Q3 Audit Lock', rank: 0 },
    { m: 11, d: 11, name: 'Boiler Service', rank: 2 },
    { m: 12, d: 20, name: 'Year-End Close', rank: 1 },
  ];

  const allMilestones: FacilityMilestone[] = [];
  for (const y of years) {
    for (const spec of milestoneSpecs) {
      const dIdx = dayIndex(y, spec.m, spec.d);
      if (dIdx >= 0 && dIdx < totalDays) {
        allMilestones.push({ day: dIdx, name: spec.name, rank: spec.rank });
      }
    }
  }
  allMilestones.sort((a, b) => a.day - b.day);

  const milestoneByDay = new Map<number, string>(allMilestones.map((m) => [m.day, m.name]));
  const milestones = allMilestones.filter((m) => m.day >= firstDay);

  const monthStarts: { off: number; m: number; y: number }[] = [];
  for (let d = firstDay; d <= lastDay; d++) {
    if (d === firstDay || days[d].d === 1) {
      monthStarts.push({ off: d - firstDay, m: days[d].m, y: days[d].y });
    }
  }

  const peakYear = dayIndex(reportYear, 6, 1) <= lastDay - 14 ? reportYear : reportYear - 1;
  const presets = [
    { id: '12m', label: 'Full year', from: firstDay, to: lastDay, hint: 'Rolling 12 months up to today' },
    { id: '6m', label: 'Half year', from: Math.max(firstDay, trailingStart(6)), to: lastDay, hint: 'Last 6 months up to today' },
    { id: '3m', label: 'Quarter', from: Math.max(firstDay, trailingStart(3)), to: lastDay, hint: 'Last 3 months up to today' },
    {
      id: 'peak',
      label: 'Peak Season',
      from: Math.max(firstDay, dayIndex(peakYear, 5, 15)),
      to: Math.min(lastDay, dayIndex(peakYear, 7, 15)),
      hint: 'Most recent summer chiller peak window',
    },
    { id: '30d', label: '30 days', from: Math.max(firstDay, lastDay - 29), to: lastDay, hint: 'Trailing 30 days up to today' },
  ];

  return {
    today: todayUtc,
    todayIso,
    reportYear,
    epoch,
    firstDay,
    lastDay,
    totalDays,
    yearDays,
    days,
    twin,
    milestones,
    milestoneByDay,
    monthStarts,
    presets,
  };
}

export function fmtDay(cal: RollingTimelineCalendar, i: number, opts: { year?: boolean; weekday?: boolean } = {}): string {
  const safe = clamp(i, 0, cal.days.length - 1);
  const { y, m, d, dow } = cal.days[safe];
  return `${opts.weekday ? `${WEEKDAYS[dow]} ` : ''}${d} ${MONTHS[m - 1]}${opts.year ? ` ${y}` : ''}`;
}

export function fmtRange(cal: RollingTimelineCalendar, a: number, b: number): string {
  const safeA = clamp(a, 0, cal.days.length - 1);
  const safeB = clamp(b, 0, cal.days.length - 1);
  const sameYear = cal.days[safeA].y === cal.days[safeB].y;
  return `${fmtDay(cal, safeA, { year: !sameYear })} – ${fmtDay(cal, safeB, { year: true })}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NODE_CATALOG: { name: string; wing: string; cohort: number; capLitersDay: number }[] = [
  // Cohort 0: Cooling Loops
  { name: 'Cooling Tower B1', wing: 'Chiller Plant B', cohort: 0, capLitersDay: 11800 },
  { name: 'Cooling Tower B2', wing: 'Chiller Plant B', cohort: 0, capLitersDay: 10900 },
  { name: 'Condenser Header C2', wing: 'Process Cooling Loop', cohort: 0, capLitersDay: 9200 },
  { name: 'Chilled Loop Return', wing: 'Chiller Plant B', cohort: 0, capLitersDay: 6600 },
  { name: 'Heat Exchanger Bay 4', wing: 'Process Cooling Loop', cohort: 0, capLitersDay: 8400 },
  { name: 'HVAC Evaporator Bank', wing: 'Chiller Plant B', cohort: 0, capLitersDay: 5400 },
  { name: 'Dry Cooler Spray Ring', wing: 'Process Cooling Loop', cohort: 0, capLitersDay: 4100 },
  { name: 'Glycol Makeup Feed', wing: 'Process Cooling Loop', cohort: 0, capLitersDay: 2900 },
  // Cohort 1: Process Trains
  { name: 'RO Permeate Train 01', wing: 'East Filtration Hall', cohort: 1, capLitersDay: 7600 },
  { name: 'RO Permeate Train 02', wing: 'East Filtration Hall', cohort: 1, capLitersDay: 7100 },
  { name: 'Membrane Backwash Skid', wing: 'East Filtration Hall', cohort: 1, capLitersDay: 4100 },
  { name: 'Boiler Feed Makeup', wing: 'South Boiler Make-Up', cohort: 1, capLitersDay: 5500 },
  { name: 'Softener Regeneration', wing: 'South Boiler Make-Up', cohort: 1, capLitersDay: 3400 },
  { name: 'CIP Washdown Manifold', wing: 'East Filtration Hall', cohort: 1, capLitersDay: 3800 },
  { name: 'Condensate Polisher', wing: 'South Boiler Make-Up', cohort: 1, capLitersDay: 2800 },
  // Cohort 2: Municipal Mains
  { name: 'Primary Municipal Intake', wing: 'Main Supply Header', cohort: 2, capLitersDay: 14800 },
  { name: 'Reserve Cistern Transfer', wing: 'Main Supply Header', cohort: 2, capLitersDay: 6100 },
  { name: 'North Riser Manifold', wing: 'North Utility Wing', cohort: 2, capLitersDay: 5100 },
  { name: 'Fire Loop Jockey Feed', wing: 'Main Supply Header', cohort: 2, capLitersDay: 2200 },
  { name: 'Potable Booster Header', wing: 'North Utility Wing', cohort: 2, capLitersDay: 4400 },
  // Cohort 3: ESP32 + FS-S401
  { name: 'ESP32 Bench Node A1', wing: 'North Utility Wing', cohort: 3, capLitersDay: 4200 },
  { name: 'FS-S401 Inlet Loop 02', wing: 'North Utility Wing', cohort: 3, capLitersDay: 3600 },
  { name: 'Bench Calibration Riser', wing: 'East Filtration Hall', cohort: 3, capLitersDay: 2400 },
  { name: 'GPIO34 Aux Flow Tap', wing: 'South Boiler Make-Up', cohort: 3, capLitersDay: 1900 },
];

const DRIVER_WEIGHTS: number[][] = [
  // Cooling, Process, Municipal, ESP32
  [0.52, 0.08, 0.06, 0.14], // Chiller Make-Up
  [0.05, 0.44, 0.06, 0.12], // RO Permeate & Flush
  [0.08, 0.24, 0.04, 0.08], // Boiler Feedwater
  [0.06, 0.06, 0.56, 0.10], // Header Transfer
  [0.04, 0.10, 0.08, 0.10], // Clean-in-Place
  [0.06, 0.04, 0.10, 0.08], // Night-Floor Leak Watch
  [0.02, 0.02, 0.02, 0.30], // Bench Flow Checks
  [0.17, 0.02, 0.08, 0.08], // Auxiliary Risers
];

const COST_WEIGHTS: number[][] = [
  // Cooling, Process, Municipal, ESP32
  [0.24, 0.28, 0.58, 0.46], // Municipal Volumetric
  [0.44, 0.08, 0.12, 0.18], // Cooling Make-Up
  [0.06, 0.32, 0.08, 0.12], // RO Reject & Flush
  [0.12, 0.08, 0.08, 0.08], // Over-Cap Surcharge
  [0.08, 0.18, 0.04, 0.08], // Boiler Treatment
  [0.06, 0.06, 0.10, 0.08], // Night-Floor Waste
];

const SUBSYSTEM_COHORT_SPLIT = [0.28, 0.24, 0.20, 0.15, 0.13];

function cumulate(arr: Float64Array): void {
  for (let i = 1; i < arr.length; i++) {
    arr[i] += arr[i - 1];
  }
}

function span(p: Float64Array, a: number, b: number): number {
  const safeA = clamp(a, 0, p.length - 2);
  const safeB = clamp(b, safeA, p.length - 2);
  return p[safeB + 1] - p[safeA];
}

export function buildRollingDatasetStore(options: {
  sourceMode: BusinessDataSourceMode;
  physicalSnapshot: PhysicalSupabaseSnapshot;
  todayUtc?: number;
}): RollingDatasetStore {
  const calendar = createRollingCalendar(options.todayUtc);
  const { totalDays, firstDay, days, epoch } = calendar;
  const fresh = () => new Float64Array(totalDays + 1);
  const col = (n: number) => Array.from({ length: n }, fresh);
  const grid = (rows: number, cols: number) => Array.from({ length: rows }, () => col(cols));

  const SEGS = COHORTS.length;
  const series = {
    cap: col(SEGS),
    intake: col(SEGS),
    excess: col(SEGS),
    cost: col(SEGS),
    reclaimed: col(SEGS),
    driver: grid(SEGS, OPERATIONAL_DRIVERS.length),
    costCat: grid(SEGS, COST_CATEGORIES.length),
    subsystem: grid(SEGS, SUBSYSTEM_GROUPS.length),
  };

  const readings = options.physicalSnapshot.readings;
  const devices = options.physicalSnapshot.devices;

  // Strict Physical-Only empty state
  if (options.sourceMode === 'physical' && readings.length === 0) {
    return {
      calendar,
      cohortCounts: [0, 0, 0, 0],
      totalNodes: 0,
      provenance: 'physical',
      emptyPhysicalReason:
        'Verified Physical Mode is active and Supabase returned 0 FS-S401 sensor readings for this account.',
      series,
      nodes: [],
    };
  }

  // Strict Physical-Only populated mode — map directly from real Supabase readings & devices
  if (options.sourceMode === 'physical' && readings.length > 0) {
    const grouped = new Map<string, typeof readings>();
    for (const r of readings) {
      const list = grouped.get(r.device_id) ?? [];
      list.push(r);
      grouped.set(r.device_id, list);
    }

    const nodes: RollingDatasetStore['nodes'] = [];
    const cohortCounts = [0, 0, 0, 0];

    for (const [devId, devReadings] of grouped.entries()) {
      const dev = devices.find((d) => d.id === devId || d.device_eui === devId);
      const cohort = 3; // ESP32 + FS-S401
      cohortCounts[cohort]++;

      const meanDaily =
        devReadings.reduce((s, r) => s + Number(r.daily_total_liters ?? r.current_liters ?? 0), 0) /
        Math.max(1, devReadings.length);
      const capDay = Math.max(500, Math.round(meanDaily * 1.15));

      const capArr = fresh();
      const intakeArr = fresh();
      const costArr = fresh();
      const reclaimedArr = fresh();

      for (const r of devReadings) {
        const ts = Date.parse(r.recorded_at);
        if (!Number.isFinite(ts)) continue;
        const utcDay = Date.UTC(
          new Date(ts).getUTCFullYear(),
          new Date(ts).getUTCMonth(),
          new Date(ts).getUTCDate(),
        );
        const idx = Math.round((utcDay - epoch) / DAY_MS);
        if (idx < 0 || idx >= totalDays) continue;

        const liters = Math.max(0, Number(r.daily_total_liters ?? r.current_liters ?? 0));
        const over = Math.max(0, liters - capDay);
        const saved = Math.max(0, capDay - liters) * 0.4;
        const inr = liters * DEFAULT_INR_WATER_RATE;

        capArr[idx + 1] += capDay;
        intakeArr[idx + 1] += liters;
        costArr[idx + 1] += inr;
        reclaimedArr[idx + 1] += saved;

        series.cap[cohort][idx + 1] += capDay;
        series.intake[cohort][idx + 1] += liters;
        series.excess[cohort][idx + 1] += over;
        series.cost[cohort][idx + 1] += inr;
        series.reclaimed[cohort][idx + 1] += saved;

        series.driver[cohort][6][idx + 1] += liters * 0.65;
        series.driver[cohort][3][idx + 1] += liters * 0.35;
        series.costCat[cohort][0][idx + 1] += inr * 0.78;
        series.costCat[cohort][3][idx + 1] += over * DEFAULT_INR_WATER_RATE;
        series.subsystem[cohort][4][idx + 1] += saved;
      }

      cumulate(capArr);
      cumulate(intakeArr);
      cumulate(costArr);
      cumulate(reclaimedArr);

      nodes.push({
        id: devId,
        name: dev?.name || `ESP32 Bench (${devId.slice(0, 6)})`,
        wing: dev?.location || 'Hardware Bench',
        cohort,
        capLitersDay: capDay,
        provenance: 'physical',
        cap: capArr,
        intake: intakeArr,
        cost: costArr,
        reclaimed: reclaimedArr,
      });
    }

    [
      series.cap,
      series.intake,
      series.excess,
      series.cost,
      series.reclaimed,
      ...series.driver,
      ...series.costCat,
      ...series.subsystem,
    ].forEach((list) => list.forEach(cumulate));

    return {
      calendar,
      cohortCounts,
      totalNodes: nodes.length,
      provenance: 'physical',
      emptyPhysicalReason: null,
      series,
      nodes,
    };
  }

  // Hybrid or Demo Enterprise Dataset (deterministic seeded engine)
  const rng = mulberry32(0x41515541);
  const between = (a: number, b: number) => a + rng() * (b - a);
  const nodes: RollingDatasetStore['nodes'] = [];
  const cohortCounts = [0, 0, 0, 0];

  const isHybridPhysical = options.sourceMode === 'hybrid' && readings.length > 0;
  const latestPhysicalDaily = isHybridPhysical
    ? Number(readings[0]?.daily_total_liters ?? readings[0]?.current_liters ?? 0)
    : 0;

  NODE_CATALOG.forEach((spec, idx) => {
    cohortCounts[spec.cohort]++;
    const overCapNode = idx === 2 || idx === 9 || idx === 17; // 3 watch/over-cap realistic nodes
    const efficiencyBias = overCapNode ? between(1.04, 1.14) : between(0.76, 0.96);

    const capArr = fresh();
    const intakeArr = fresh();
    const costArr = fresh();
    const reclaimedArr = fresh();

    for (let i = 0; i < totalDays; i++) {
      const { m, dow } = days[i];
      const isWeekend = dow === 0 || dow === 6;
      // Seasonal factor: warmer May–Jul raises cooling load; Oct–Jan lowers slightly
      const seasonFactor =
        m >= 5 && m <= 7
          ? 1.18
          : m === 4 || m === 8
          ? 1.07
          : m === 12 || m === 1
          ? 0.89
          : 0.98;
      const shiftFactor = isWeekend ? (spec.cohort === 2 ? 0.82 : 0.72) : 1.0;
      // Year-over-year efficiency improvement (~7% leaner in current 12m window)
      const yoyImprovement = i >= firstDay ? 0.93 : 1.01;
      const noise = between(0.92, 1.09);

      const capDay = Math.round(spec.capLitersDay * (isWeekend ? 0.85 : 1));
      let liters = Math.round(spec.capLitersDay * efficiencyBias * seasonFactor * shiftFactor * yoyImprovement * noise);

      // Anchor latest Bench A1 day to verified FS-S401 physical reading in Hybrid mode
      if (isHybridPhysical && idx === 20 && i === calendar.lastDay && latestPhysicalDaily > 0) {
        liters = Math.round(latestPhysicalDaily);
      }

      const excessDay = Math.max(0, liters - capDay);
      const savedDay = Math.max(0, Math.round((capDay - liters) * (i >= firstDay ? 0.55 : 0.35)));
      const surcharge = excessDay * (DEFAULT_INR_WATER_RATE * 1.45);
      const costDay = liters * DEFAULT_INR_WATER_RATE + surcharge;

      capArr[i + 1] = capDay;
      intakeArr[i + 1] = liters;
      costArr[i + 1] = costDay;
      reclaimedArr[i + 1] = savedDay;

      series.cap[spec.cohort][i + 1] += capDay;
      series.intake[spec.cohort][i + 1] += liters;
      series.excess[spec.cohort][i + 1] += excessDay;
      series.cost[spec.cohort][i + 1] += costDay;
      series.reclaimed[spec.cohort][i + 1] += savedDay;

      for (let d = 0; d < OPERATIONAL_DRIVERS.length; d++) {
        series.driver[spec.cohort][d][i + 1] += liters * DRIVER_WEIGHTS[d][spec.cohort];
      }
      for (let c = 0; c < COST_CATEGORIES.length; c++) {
        series.costCat[spec.cohort][c][i + 1] += costDay * COST_WEIGHTS[c][spec.cohort];
      }
      for (let s = 0; s < SUBSYSTEM_GROUPS.length; s++) {
        series.subsystem[spec.cohort][s][i + 1] += savedDay * SUBSYSTEM_COHORT_SPLIT[s];
      }
    }

    cumulate(capArr);
    cumulate(intakeArr);
    cumulate(costArr);
    cumulate(reclaimedArr);

    nodes.push({
      id: idx + 1,
      name:
        isHybridPhysical && idx === 20 && devices[0]?.name
          ? `${devices[0].name} (FS-S401)`
          : spec.name,
      wing:
        isHybridPhysical && idx === 20 && devices[0]?.location
          ? devices[0].location
          : spec.wing,
      cohort: spec.cohort,
      capLitersDay: spec.capLitersDay,
      provenance: isHybridPhysical && idx === 20 ? 'physical' : 'demo',
      cap: capArr,
      intake: intakeArr,
      cost: costArr,
      reclaimed: reclaimedArr,
    });
  });

  [
    series.cap,
    series.intake,
    series.excess,
    series.cost,
    series.reclaimed,
    ...series.driver,
    ...series.costCat,
    ...series.subsystem,
  ].forEach((list) => list.forEach(cumulate));

  return {
    calendar,
    cohortCounts,
    totalNodes: nodes.length,
    provenance: isHybridPhysical ? 'mixed' : 'demo',
    emptyPhysicalReason: null,
    series,
    nodes,
  };
}

export function buildRollingView(
  store: RollingDatasetStore,
  from: number,
  to: number,
  segs: number[],
): RollingAccountView {
  const { calendar, series, nodes } = store;
  const safeFrom = clamp(from, calendar.firstDay, calendar.lastDay);
  const safeTo = clamp(to, safeFrom, calendar.lastDay);
  const pFrom = clamp(calendar.twin[safeFrom], 0, calendar.lastDay);
  const pTo = clamp(calendar.twin[safeTo], pFrom, calendar.lastDay);

  const metricMap: Record<RollingMetricId, Float64Array[]> = {
    intake: series.intake,
    excess: series.excess,
    cost: series.cost,
    reclaimed: series.reclaimed,
  };

  const sumPair = (arrs: Float64Array[]): RollingPair => {
    let cur = 0;
    let prev = 0;
    for (const s of segs) {
      cur += span(arrs[s], safeFrom, safeTo);
      prev += span(arrs[s], pFrom, pTo);
    }
    return { cur, prev };
  };

  const rollingSeries = (metric: RollingMetricId, yearBefore: boolean): number[] => {
    const stores = segs.map((s) => metricMap[metric][s]);
    const out = new Array<number>(safeTo - safeFrom + 1);
    for (let d = safeFrom; d <= safeTo; d++) {
      const end = clamp(yearBefore ? calendar.twin[d] : d, 6, calendar.lastDay);
      let v = 0;
      for (const p of stores) v += p[end + 1] - p[end - 6];
      out[d - safeFrom] = v;
    }
    return out;
  };

  const slices = (
    labels: readonly { label: string; note: string }[],
    gridStores: Float64Array[][],
  ): RollingSlice[] =>
    labels.map((l, k) => {
      let cur = 0;
      let prev = 0;
      for (const s of segs) {
        cur += span(gridStores[s][k], safeFrom, safeTo);
        prev += span(gridStores[s][k], pFrom, pTo);
      }
      return { id: k, label: l.label, note: l.note, cur, prev };
    });

  const rows: FacilityMeterRow[] = nodes
    .filter((n) => segs.includes(n.cohort))
    .map((n) => {
      const capTotalLiters = span(n.cap, safeFrom, safeTo);
      const intakeLiters = span(n.intake, safeFrom, safeTo);
      const adherenceRatio = capTotalLiters > 0 ? intakeLiters / capTotalLiters : null;
      const standing: MeterStanding =
        adherenceRatio === null || intakeLiters === 0
          ? 'idle'
          : adherenceRatio <= 0.96
          ? 'optimal'
          : adherenceRatio <= 1.05
          ? 'watch'
          : 'overcap';

      return {
        id: n.id,
        name: n.name,
        wing: n.wing,
        cohort: n.cohort,
        capLitersDay: n.capLitersDay,
        intakeLiters,
        capTotalLiters,
        adherenceRatio,
        costInr: span(n.cost, safeFrom, safeTo),
        reclaimedLiters: span(n.reclaimed, safeFrom, safeTo),
        standing,
        provenance: n.provenance,
      };
    });

  return {
    from: safeFrom,
    to: safeTo,
    days: safeTo - safeFrom + 1,
    totals: {
      intake: sumPair(series.intake),
      excess: sumPair(series.excess),
      cost: sumPair(series.cost),
      reclaimed: sumPair(series.reclaimed),
    },
    capTotal: sumPair(series.cap),
    rolling: {
      intake: { cur: rollingSeries('intake', false), prev: rollingSeries('intake', true) },
      excess: { cur: rollingSeries('excess', false), prev: rollingSeries('excess', true) },
      cost: { cur: rollingSeries('cost', false), prev: rollingSeries('cost', true) },
      reclaimed: { cur: rollingSeries('reclaimed', false), prev: rollingSeries('reclaimed', true) },
    },
    drivers: slices(OPERATIONAL_DRIVERS, series.driver),
    costCategories: slices(COST_CATEGORIES, series.costCat),
    subsystems: slices(SUBSYSTEM_GROUPS, series.subsystem),
    rows,
  };
}

export function buildYearShape(
  store: RollingDatasetStore,
  metric: RollingMetricId,
  segs: number[],
): number[] {
  const { firstDay, lastDay } = store.calendar;
  const view = buildRollingView(store, firstDay, lastDay, segs);
  return view.rolling[metric].cur;
}
