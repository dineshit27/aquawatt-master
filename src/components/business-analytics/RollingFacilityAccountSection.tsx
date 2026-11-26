import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent, ReactNode, SVGProps } from 'react';
import { RefreshCw } from 'lucide-react';
import type { BusinessDataSourceMode } from '../../types/businessAnalytics';
import type { PhysicalSupabaseSnapshot } from '../../services/businessAnalyticsService';
import {
  buildRollingDatasetStore,
  buildRollingView,
  buildYearShape,
  clamp,
  COHORTS,
  FacilityMeterRow,
  fmtDay,
  fmtInrAxis,
  fmtInrParts,
  fmtInrShort,
  fmtInt,
  fmtLitersAxis,
  fmtLitersParts,
  fmtLitersShort,
  fmtPct,
  fmtRange,
  linePath,
  MeterStanding,
  MetricPart,
  MONTHS,
  niceTicks,
  placeLabels,
  resample,
  ROLLING_METRIC_ORDER,
  RollingAccountView,
  RollingDatasetStore,
  RollingMetricId,
  RollingSlice,
  RollingTimelineCalendar,
  signedPct,
} from '../../services/rollingAccountModel';

interface RollingFacilityAccountSectionProps {
  sourceMode: BusinessDataSourceMode;
  physicalSnapshot: PhysicalSupabaseSnapshot;
  isLoadingPhysical: boolean;
  onRefreshPhysical: () => void;
  onSwitchToHybrid: () => void;
}

interface MetricConfig {
  label: string;
  chart: string;
  invert: boolean;
  parts: (v: number) => MetricPart[];
  short: (v: number) => string;
  axis: (v: number) => string;
  ticks: (max: number) => number[];
  empty: string;
}

const METRICS: Record<RollingMetricId, MetricConfig> = {
  intake: {
    label: 'Water Intake',
    chart: '7-day rolling intake (L)',
    invert: false,
    parts: fmtLitersParts,
    short: fmtLitersShort,
    axis: fmtLitersAxis,
    ticks: niceTicks,
    empty: 'No intake flow recorded for the selected cohorts in this period.',
  },
  excess: {
    label: 'Over-Cap Excess',
    chart: '7-day volume above cap (L)',
    invert: true,
    parts: fmtLitersParts,
    short: fmtLitersShort,
    axis: fmtLitersAxis,
    ticks: niceTicks,
    empty: 'Zero volume exceeded allocated daily caps in this period.',
  },
  cost: {
    label: 'Est. Water Spend',
    chart: '7-day estimated spend (₹)',
    invert: true,
    parts: fmtInrParts,
    short: fmtInrShort,
    axis: fmtInrAxis,
    ticks: niceTicks,
    empty: 'No tariff charges accrued for this period.',
  },
  reclaimed: {
    label: 'Reclaimed & Saved',
    chart: '7-day conservation & reclaim (L)',
    invert: false,
    parts: fmtLitersParts,
    short: fmtLitersShort,
    axis: fmtLitersAxis,
    ticks: niceTicks,
    empty: 'No reclaimed or under-cap savings logged in this period.',
  },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function useTweenSeries(target: number[][], opts: { duration?: number; grow?: boolean } = {}): number[][] {
  const { duration = 420, grow = true } = opts;
  const reduced = usePrefersReducedMotion();
  const shown = useRef<number[][] | null>(null);
  if (shown.current === null) {
    shown.current = grow && !reduced ? target.map((s) => s.map(() => 0)) : target;
  }
  const [, bump] = useState(0);

  useEffect(() => {
    const start = shown.current ?? [];
    const from = target.map((s, k) => resample(start[k] ?? [], s.length));
    const settled = from.every((f, k) => f.every((v, i) => v === target[k][i]));
    if (reduced || settled) {
      if (shown.current !== target) {
        shown.current = target;
        bump((n) => n + 1);
      }
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - (1 - t) ** 3;
      shown.current =
        t >= 1
          ? target
          : target.map((s, k) => s.map((v, i) => from[k][i] + (v - from[k][i]) * e));
      bump((n) => n + 1);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return shown.current;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, Math.round(width)] as const;
}

function useMounted(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}

type IconProps = SVGProps<SVGSVGElement>;

const STROKE = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const SearchIcon = (p: IconProps) => (
  <svg {...STROKE} {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.2 10.2 3.3 3.3" />
  </svg>
);

const CheckIcon = (p: IconProps) => (
  <svg {...STROKE} strokeWidth={2} {...p}>
    <path d="m3.5 8.4 3 3 6-6.6" />
  </svg>
);

const ArrowIcon = ({ up, ...p }: IconProps & { up: boolean }) => (
  <svg {...STROKE} strokeWidth={2} {...p}>
    <path d={up ? 'M8 12.5v-9M4 7.5l4-4 4 4' : 'M8 3.5v9M4 8.5l4 4 4-4'} />
  </svg>
);

function Parts({ parts }: { parts: MetricPart[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="aw-rfa-nowrap">
            {p.n}
            {p.u && <span className={p.gap ? 'aw-rfa-u aw-rfa-u-gap' : 'aw-rfa-u'}>{p.u}</span>}
          </span>
        </span>
      ))}
    </>
  );
}

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (!(prev > 0)) {
    return (
      <span className="aw-rfa-delta aw-rfa-muted">
        —<span className="aw-rfa-sr">no prior-year baseline to compare</span>
      </span>
    );
  }
  const change = (cur - prev) / prev;
  if (Math.abs(change) < 0.005) {
    return (
      <span className="aw-rfa-delta aw-rfa-muted">
        Level<span className="aw-rfa-sr"> with the year before</span>
      </span>
    );
  }
  const up = change > 0;
  return (
    <span className={`aw-rfa-delta ${up !== invert ? 'aw-rfa-good' : 'aw-rfa-bad'}`}>
      <ArrowIcon up={up} />
      {fmtPct(change)}
      <span className="aw-rfa-sr">{up ? ' up' : ' down'} on the year before</span>
    </span>
  );
}

function ChartTip({
  show,
  x,
  y,
  boxWidth,
  width = 216,
  above = false,
  center = false,
  children,
}: {
  show: boolean;
  x: number;
  y: number;
  boxWidth: number;
  width?: number;
  above?: boolean;
  center?: boolean;
  children: ReactNode;
}) {
  const wasShown = useRef(false);
  const glide = show && wasShown.current;
  useEffect(() => {
    wasShown.current = show;
  }, [show]);

  const effectiveWidth = Math.min(width, Math.max(168, boxWidth - 16));
  const preferred = center
    ? x - effectiveWidth / 2
    : x + 14 + effectiveWidth > boxWidth
    ? x - 14 - effectiveWidth
    : x + 14;
  const left = Math.round(Math.max(4, Math.min(preferred, Math.max(4, boxWidth - effectiveWidth - 4))));
  return (
    <div
      aria-hidden="true"
      className={`aw-rfa-tip${glide ? ' glide' : ''}${show ? ' show' : ''}`}
      style={{
        width: effectiveWidth,
        transform: `translate(${left}px, ${Math.round(y)}px)${above ? ' translateY(-100%)' : ''}`,
      }}
    >
      {children}
    </div>
  );
}

function YearKey({ kind = 'bar' }: { kind?: 'bar' | 'line' | 'mark' }) {
  return (
    <ul className="aw-rfa-key" aria-hidden="true">
      <li>
        <span className={kind === 'bar' ? 'aw-rfa-sw-bar' : 'aw-rfa-sw-line'} />
        This year
      </li>
      <li>
        {kind === 'bar' && <span className="aw-rfa-sw-bar dim" />}
        {kind === 'line' && <span className="aw-rfa-sw-dash" />}
        {kind === 'mark' && <span className="aw-rfa-sw-mark" />}
        Year before
      </li>
    </ul>
  );
}

function useTip() {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  const last = useRef({ i: 0, x: 0, y: 0 });
  const timer = useRef(0);
  if (tip) last.current = tip;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (i: number) => (e: PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    window.clearTimeout(timer.current);
    setTip({ i, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const hide = (e: PointerEvent) => {
    window.clearTimeout(timer.current);
    if (e.pointerType === 'touch') timer.current = window.setTimeout(() => setTip(null), 2200);
    else setTip(null);
  };

  return { ref, width, tip, at: last.current, show, hide };
}

function TipBody({
  item,
  cur,
  prev,
  share,
  invert = false,
}: {
  item: RollingSlice;
  cur: string;
  prev: string;
  share?: string;
  invert?: boolean;
}) {
  return (
    <>
      <p className="aw-rfa-tip-title">{item.label}</p>
      <p className="aw-rfa-tip-note">{item.note}</p>
      <dl className="aw-rfa-tip-grid">
        <dt>This year</dt>
        <dd>{cur}</dd>
        <dt>Year before</dt>
        <dd>{prev}</dd>
        {share && (
          <>
            <dt>Share</dt>
            <dd>{share}</dd>
          </>
        )}
      </dl>
      <div className="aw-rfa-tip-foot">
        Change
        <Delta cur={item.cur} prev={item.prev} invert={invert} />
      </div>
    </>
  );
}

const TRACK = 52;
const MIN_SPAN = 7;
type DragMode = 'start' | 'end' | 'pan';

function YearRibbon({
  calendar,
  from,
  to,
  shape,
  onChange,
}: {
  calendar: RollingTimelineCalendar;
  from: number;
  to: number;
  shape: number[];
  onChange: (f: number, t: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const drag = useRef<{ mode: DragMode; grab: number; span: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const { firstDay, yearDays, monthStarts, milestones } = calendar;
  const a = from - firstDay;
  const b = to - firstDay;
  const px = (off: number) => (off / yearDays) * width;
  const left = px(a);
  const selWidth = px(b + 1) - left;

  const target = useMemo(() => [shape], [shape]);
  const [anim] = useTweenSeries(target);
  const peak = Math.max(1, ...anim);
  const area =
    width > 0 && anim.length > 0
      ? `M0,${TRACK}` +
        anim
          .map(
            (v, i) =>
              `L${(((i + 0.5) / anim.length) * width).toFixed(1)},${(
                TRACK -
                3 -
                (v / peak) * (TRACK - 13)
              ).toFixed(1)}`,
          )
          .join('') +
        `L${width},${TRACK}Z`
      : '';

  const ribbonMarks = useMemo(() => milestones.filter((m) => m.rank <= 3), [milestones]);
  const labels = useMemo(
    () =>
      placeLabels(
        ribbonMarks.map((f) => ({
          x: ((f.day - firstDay + 0.5) / yearDays) * width,
          label: f.name,
          rank: f.rank,
        })),
        width,
      ),
    [ribbonMarks, firstDay, yearDays, width],
  );

  const dayAt = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return 0;
    return clamp(Math.floor(((clientX - box.left) / box.width) * yearDays), 0, yearDays - 1);
  };

  const begin = (mode: DragMode) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, grab: dayAt(e.clientX) - (mode === 'end' ? b : a), span: b - a };
    setDragging(true);
  };

  const jump = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const spanLen = b - a;
    const day = dayAt(e.clientX);
    const start = clamp(day - Math.floor(spanLen / 2), 0, yearDays - 1 - spanLen);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: 'pan', grab: day - start, span: spanLen };
    setDragging(true);
    if (start !== a) onChange(firstDay + start, firstDay + start + spanLen);
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const day = dayAt(e.clientX) - d.grab;
    if (d.mode === 'start') {
      const next = clamp(day, 0, b - MIN_SPAN + 1);
      if (next !== a) onChange(firstDay + next, to);
    } else if (d.mode === 'end') {
      const next = clamp(day, a + MIN_SPAN - 1, yearDays - 1);
      if (next !== b) onChange(from, firstDay + next);
    } else {
      const next = clamp(day, 0, yearDays - 1 - d.span);
      if (next !== a) onChange(firstDay + next, firstDay + next + d.span);
    }
  };

  const release = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKey = (which: 'start' | 'end') => (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -30,
      PageUp: 30,
      Home: -yearDays,
      End: yearDays,
    };
    let step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    if (e.shiftKey && Math.abs(step) === 1) step *= 7;
    if (which === 'start') onChange(firstDay + clamp(a + step, 0, b - MIN_SPAN + 1), to);
    else onChange(from, firstDay + clamp(b + step, a + MIN_SPAN - 1, yearDays - 1));
  };

  const glide = !dragging ? ' glide' : '';

  const handle = (which: 'start' | 'end') => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={which === 'start' ? 'First day of the period' : 'Last day of the period'}
      aria-orientation="horizontal"
      aria-valuemin={which === 'start' ? 0 : a + MIN_SPAN - 1}
      aria-valuemax={which === 'start' ? b - MIN_SPAN + 1 : yearDays - 1}
      aria-valuenow={which === 'start' ? a : b}
      aria-valuetext={fmtDay(calendar, which === 'start' ? from : to, { weekday: true, year: true })}
      onKeyDown={onKey(which)}
      onPointerDown={begin(which)}
      className={`aw-rfa-handle${glide}`}
      style={{ transform: `translateX(${which === 'start' ? left : left + selWidth}px)` }}
    >
      <span className="aw-rfa-grip" />
    </div>
  );

  const wide = width >= 620;

  return (
    <div className="aw-rfa-ribbon">
      <div className="aw-rfa-feasts" aria-hidden="true">
        {labels.map((l) => (
          <span
            key={`${l.label}-${l.x}`}
            className={`aw-rfa-feast${l.anchor === 'middle' ? ' mid' : ''}${l.rank <= 1 ? ' q' : ''}`}
            style={l.anchor === 'end' ? { right: 0 } : { left: l.anchor === 'start' ? 0 : l.x + l.dx }}
          >
            {l.label}
          </span>
        ))}
      </div>

      <div
        ref={ref}
        className="aw-rfa-track"
        style={{ height: TRACK }}
        onPointerDown={jump}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        {width > 0 && (
          <>
            <svg width={width} height={TRACK} className="aw-rfa-layer" aria-hidden="true">
              <path d={area} className="aw-rfa-ribbon-dim" />
            </svg>

            <div
              onPointerDown={begin('pan')}
              className={`aw-rfa-sel${glide}`}
              style={{ width: Math.max(4, selWidth), transform: `translateX(${left}px)` }}
            >
              <svg
                width={width}
                height={TRACK}
                className={`aw-rfa-sel-svg${glide}`}
                style={{ transform: `translateX(${-left}px)` }}
                aria-hidden="true"
              >
                <path d={area} className="aw-rfa-ribbon-lit" />
              </svg>
              <span className="aw-rfa-sel-ring" />
            </div>

            <svg width={width} height={TRACK} className="aw-rfa-marks" aria-hidden="true">
              {monthStarts.map((m) => (
                <line
                  key={m.off}
                  x1={px(m.off)}
                  x2={px(m.off)}
                  y1={TRACK - 5}
                  y2={TRACK}
                  className="aw-rfa-month-tick"
                />
              ))}
              {ribbonMarks.map((f) => {
                const x = px(f.day - firstDay + 0.5);
                return (
                  <g key={`${f.name}-${f.day}`}>
                    <line x1={x} x2={x} y1={0} y2={TRACK} className="aw-rfa-feast-rule" />
                    <rect
                      x={x - 3}
                      y={-3}
                      width={6}
                      height={6}
                      transform={`rotate(45 ${x} 0)`}
                      className="aw-rfa-feast-gem"
                    />
                  </g>
                );
              })}
            </svg>

            {handle('start')}
            {handle('end')}
          </>
        )}
      </div>

      <div className="aw-rfa-months" aria-hidden="true">
        {monthStarts.map((m, i) => {
          const next = monthStarts[i + 1]?.off ?? yearDays;
          const name = MONTHS[m.m - 1];
          const space = px(next - m.off);
          const label = !wide ? name[0] : m.m === 1 && width >= 900 && space >= 52 ? `${name} ${m.y}` : name;
          if (space < label.length * 6 + 2) return null;
          return (
            <span key={m.off} className="aw-rfa-month" style={{ left: px((m.off + next) / 2) }}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PeriodPresets({
  presets,
  from,
  to,
  onRange,
}: {
  presets: RollingTimelineCalendar['presets'];
  from: number;
  to: number;
  onRange: (from: number, to: number) => void;
}) {
  return (
    <div role="group" aria-label="Rolling reporting window" className="aw-rfa-seg">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          title={p.hint}
          aria-pressed={from === p.from && to === p.to}
          onClick={() => onRange(p.from, p.to)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function CohortChips({
  segs,
  cohortCounts,
  totalNodes,
  onSegs,
}: {
  segs: number[];
  cohortCounts: number[];
  totalNodes: number;
  onSegs: (segs: number[]) => void;
}) {
  const toggle = (i: number) => {
    const next = segs.includes(i) ? segs.filter((s) => s !== i) : [...segs, i].sort();
    onSegs(next.length === COHORTS.length ? [] : next);
  };

  return (
    <div role="group" aria-label="Facility loop cohorts" className="aw-rfa-chips">
      <button
        type="button"
        aria-pressed={segs.length === 0}
        onClick={() => onSegs([])}
        className={`aw-rfa-chip${segs.length === 0 ? ' on' : ''}`}
      >
        All
        <span className="aw-rfa-chip-n">{totalNodes}</span>
      </button>
      {COHORTS.map((c, i) => (
        <button
          key={c.id}
          type="button"
          title={c.note}
          aria-pressed={segs.includes(i)}
          onClick={() => toggle(i)}
          className={`aw-rfa-chip${segs.includes(i) ? ' on' : ''}`}
        >
          {segs.includes(i) && <CheckIcon />}
          {c.label}
          <span className="aw-rfa-chip-n">{cohortCounts[i] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

function FilterPanel({
  store,
  from,
  to,
  segs,
  shape,
  onRange,
  onSegs,
}: {
  store: RollingDatasetStore;
  from: number;
  to: number;
  segs: number[];
  shape: number[];
  onRange: (from: number, to: number) => void;
  onSegs: (segs: number[]) => void;
}) {
  const { calendar, cohortCounts, totalNodes } = store;
  const changed = from !== calendar.firstDay || to !== calendar.lastDay || segs.length > 0;
  const days = to - from + 1;

  return (
    <section aria-label="Annual rolling account filters" className="aw-rfa-card aw-rfa-pad">
      <div className="aw-rfa-filters-top">
        <div className="aw-rfa-field">
          <p className="aw-rfa-flabel">Period</p>
          <div className="aw-rfa-xscroll">
            <PeriodPresets presets={calendar.presets} from={from} to={to} onRange={onRange} />
          </div>
        </div>
        <div className="aw-rfa-field">
          <p className="aw-rfa-flabel">Loop Cohorts</p>
          <CohortChips segs={segs} cohortCounts={cohortCounts} totalNodes={totalNodes} onSegs={onSegs} />
        </div>
      </div>

      <div className="aw-rfa-range-line">
        <p>
          <strong className="aw-rfa-range">{fmtRange(calendar, from, to)}</strong>
          <span> · {days} days, compared against the same dates one year earlier</span>
        </p>
        {changed && (
          <button
            type="button"
            onClick={() => {
              onRange(calendar.firstDay, calendar.lastDay);
              onSegs([]);
            }}
            className="aw-rfa-reset"
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="aw-rfa-ribbon-wrap">
        <YearRibbon calendar={calendar} from={from} to={to} shape={shape} onChange={onRange} />
      </div>
      <p className="aw-rfa-hint">
        Drag either handle to adjust the window, or drag the lit ribbon span to pan across the year.
      </p>
    </section>
  );
}

function SlimFilters({
  store,
  from,
  to,
  segs,
  onRange,
  onSegs,
}: {
  store: RollingDatasetStore;
  from: number;
  to: number;
  segs: number[];
  onRange: (from: number, to: number) => void;
  onSegs: (segs: number[]) => void;
}) {
  return (
    <div className="aw-rfa-slim" aria-label="Pinned period and cohort controls">
      <div className="aw-rfa-slim-in">
        <p className="aw-rfa-slim-range">{fmtRange(store.calendar, from, to)}</p>
        <PeriodPresets presets={store.calendar.presets} from={from} to={to} onRange={onRange} />
        <span aria-hidden="true" className="aw-rfa-vr" />
        <CohortChips
          segs={segs}
          cohortCounts={store.cohortCounts}
          totalNodes={store.totalNodes}
          onSegs={onSegs}
        />
      </div>
    </div>
  );
}

function Spark({ values, lit }: { values: number[]; lit: boolean }) {
  const target = useMemo(() => [resample(values, 48)], [values]);
  const [shown] = useTweenSeries(target);
  const peak = Math.max(1e-6, ...shown);
  const xs = shown.map((_, i) => (i / Math.max(1, shown.length - 1)) * 100);
  const ys = shown.map((v) => 30 - (v / peak) * 26);
  const line = linePath(xs, ys);
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={`aw-rfa-spark${lit ? ' lit' : ''}`}
      aria-hidden="true"
    >
      <path d={`${line}L100,32L0,32Z`} className="aw-rfa-spark-fill" />
      <path d={line} className="aw-rfa-spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Kpi({
  id,
  view,
  context,
  selected,
  onSelect,
}: {
  id: RollingMetricId;
  view: RollingAccountView;
  context: string;
  selected: boolean;
  onSelect: (id: RollingMetricId) => void;
}) {
  const cfg = METRICS[id];
  const { cur, prev } = view.totals[id];
  const target = useMemo(() => [[cur]], [cur]);
  const [[shown]] = useTweenSeries(target);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`aw-rfa-kpi${selected ? ' on' : ''}`}
    >
      <span className="aw-rfa-kpi-top">
        <span className="aw-rfa-kpi-label">{cfg.label}</span>
        <span aria-hidden="true" className={`aw-rfa-kpi-radio${selected ? ' on' : ''}`}>
          <span className="aw-rfa-kpi-radio-dot" />
        </span>
      </span>

      <span className="aw-rfa-kpi-value">
        <Parts parts={cfg.parts(shown)} />
      </span>

      <span className="aw-rfa-kpi-foot">
        <Delta cur={cur} prev={prev} invert={cfg.invert} />
        <span>{context}</span>
      </span>

      <Spark values={view.rolling[id].cur} lit={selected} />
      <span className="aw-rfa-sr">
        {selected ? 'Shown in the 7-day rolling chart below.' : 'Show in the 7-day rolling chart below.'}
      </span>
    </button>
  );
}

function KpiRow({
  view,
  metric,
  onSelect,
}: {
  view: RollingAccountView;
  metric: RollingMetricId;
  onSelect: (id: RollingMetricId) => void;
}) {
  const { totals, capTotal, rows, days } = view;
  const context: Record<RollingMetricId, string> = {
    intake: `of ${fmtLitersShort(capTotal.cur)} cap`,
    excess:
      capTotal.cur > 0 ? `${fmtPct(totals.excess.cur / capTotal.cur)} over ceiling` : 'within baseline',
    cost: rows.length ? `${fmtInrShort(totals.cost.cur / rows.length)} avg / meter` : '',
    reclaimed: `${fmtLitersShort((totals.reclaimed.cur / Math.max(1, days)) * 7)} / week`,
  };

  return (
    <div role="region" aria-label="Rolling account key metrics. Select one to chart." className="aw-rfa-kpis">
      {ROLLING_METRIC_ORDER.map((id) => (
        <Kpi
          key={id}
          id={id}
          view={view}
          context={context[id]}
          selected={metric === id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface Tick {
  i: number;
  label: string;
}

function dateTicks(calendar: RollingTimelineCalendar, from: number, n: number, innerWidth: number): Tick[] {
  const all: Tick[] = [];
  for (let i = 0; i < n; i++) {
    const info = calendar.days[from + i];
    if (!info) continue;
    const { d, m, y, dow } = info;
    const mon = MONTHS[m - 1];
    if (n > 110) {
      if (d === 1) all.push({ i, label: m === 1 ? `${mon} ${y}` : mon });
    } else if (n > 45) {
      if (d === 1 || d === 15) all.push({ i, label: `${d} ${mon}` });
    } else if (n > 14) {
      if (dow === 1) all.push({ i, label: `${d} ${mon}` });
    } else {
      all.push({ i, label: `${d} ${mon}` });
    }
  }
  const kept: Tick[] = [];
  let lastX = -Infinity;
  for (const t of all) {
    const x = n > 1 ? (t.i / (n - 1)) * innerWidth : 0;
    if (x - lastX < 62) continue;
    kept.push(t);
    lastX = x;
  }
  return kept;
}

function TrendChart({
  calendar,
  metric,
  cur,
  prev,
  from,
}: {
  calendar: RollingTimelineCalendar;
  metric: RollingMetricId;
  cur: number[];
  prev: number[];
  from: number;
}) {
  const cfg = METRICS[metric];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [ref, width] = useWidth<HTMLDivElement>();
  const compact = width < 560;
  const height = compact ? 245 : 320;
  const m = { t: 26, r: 10, b: 30, l: compact ? 42 : 52 };
  const iw = Math.max(40, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const base = m.t + ih;
  const n = Math.max(1, cur.length);

  const peak = useMemo(() => Math.max(0, ...cur, ...prev), [cur, prev]);
  const ticks = useMemo(() => cfg.ticks(peak), [cfg, peak]);
  const top = ticks[ticks.length - 1] ?? 1;

  const seriesTarget = useMemo(() => [cur, prev], [cur, prev]);
  const topTarget = useMemo(() => [[top]], [top]);
  const [aCur, aPrev] = useTweenSeries(seriesTarget);
  const [[aTop]] = useTweenSeries(topTarget, { grow: false });
  const yMax = Math.max(aTop, 1e-6);

  const px = (i: number, len: number) => m.l + (len > 1 ? (i / (len - 1)) * iw : iw / 2);
  const py = (v: number) => base - (Math.max(0, v) / yMax) * ih;

  const line = linePath(
    aCur.map((_, i) => px(i, aCur.length)),
    aCur.map(py),
  );
  const area = line ? `${line}L${m.l + iw},${base}L${m.l},${base}Z` : '';
  const ghost = linePath(
    aPrev.map((_, i) => px(i, aPrev.length)),
    aPrev.map(py),
  );

  const xTicks = useMemo(() => dateTicks(calendar, from, n, iw), [calendar, from, n, iw]);
  const marks = useMemo(() => {
    const inRange = calendar.milestones
      .filter((f) => f.rank <= 3 && f.day >= from && f.day <= from + n - 1)
      .map((f) => ({
        x: n > 1 ? ((f.day - from) / (n - 1)) * iw : 0,
        label: f.name,
        rank: f.rank,
      }));
    return { all: inRange, labelled: placeLabels(inRange, iw) };
  }, [calendar.milestones, from, n, iw]);

  const [hover, setHover] = useState<number | null>(null);
  const lastHover = useRef(n - 1);
  if (hover !== null) lastHover.current = hover;
  const hi = clamp(lastHover.current, 0, n - 1);
  const day = from + hi;
  const milestoneName = calendar.milestoneByDay.get(day);

  const hideTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const scrub = (e: PointerEvent<SVGRectElement>) => {
    window.clearTimeout(hideTimer.current);
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    setHover(clamp(Math.round(((e.clientX - box.left) / box.width) * (n - 1)), 0, n - 1));
  };

  const leave = (e: PointerEvent<SVGRectElement>) => {
    window.clearTimeout(hideTimer.current);
    if (e.pointerType === 'touch') hideTimer.current = window.setTimeout(() => setHover(null), 2600);
    else setHover(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') return setHover(null);
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    setHover(clamp((hover ?? n - 1) + (e.shiftKey && Math.abs(step) === 1 ? step * 7 : step), 0, n - 1));
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.matches(':focus-visible')) setHover((h) => h ?? n - 1);
  };

  const summary = `${cfg.chart}, ${fmtDay(calendar, from, { year: true })} to ${fmtDay(calendar, from + n - 1, { year: true })}. Peak seven-day total: ${cfg.short(Math.max(0, ...cur))}.`;

  return (
    <div ref={ref} className="aw-rfa-chart">
      {width > 0 && (
        <div
          role="group"
          tabIndex={0}
          aria-label={`${summary} Use left and right arrow keys to inspect day by day.`}
          onKeyDown={onKey}
          onFocus={onFocus}
          onBlur={() => setHover(null)}
          className="aw-rfa-chart-box"
        >
          <svg width={width} height={height} className="aw-rfa-svg" aria-hidden="true">
            <defs>
              <linearGradient id={`aw-rfa-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-a)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--series-a)" stopOpacity="0" />
              </linearGradient>
              <clipPath id={`aw-rfa-clip-${uid}`}>
                <rect x={m.l - 2} y={m.t - 6} width={iw + 4} height={ih + 7} />
              </clipPath>
            </defs>

            {ticks.map((t) => {
              const y = py(t);
              if (y < m.t - 1) return null;
              return (
                <g key={t}>
                  <line
                    x1={m.l}
                    x2={m.l + iw}
                    y1={y}
                    y2={y}
                    className={t === 0 ? 'aw-rfa-grid0' : 'aw-rfa-grid'}
                  />
                  <text x={m.l - 8} y={y} dy="0.32em" textAnchor="end" className="aw-rfa-ylab">
                    {cfg.axis(t)}
                  </text>
                </g>
              );
            })}

            {marks.all.map((f) => (
              <g key={`${f.label}-${f.x}`}>
                <line x1={m.l + f.x} x2={m.l + f.x} y1={m.t - 4} y2={base} className="aw-rfa-feast-rule" />
                <rect
                  x={m.l + f.x - 2.5}
                  y={base - 2.5}
                  width={5}
                  height={5}
                  transform={`rotate(45 ${m.l + f.x} ${base})`}
                  className="aw-rfa-feast-gem"
                />
              </g>
            ))}
            {marks.labelled.map((f) => (
              <text
                key={`${f.label}-${f.x}`}
                x={m.l + (f.anchor === 'start' ? 0 : f.anchor === 'end' ? iw : f.x + f.dx)}
                y={m.t - 11}
                textAnchor={f.anchor}
                className={`aw-rfa-flab${f.rank <= 1 ? ' q' : ''}`}
              >
                {f.label}
              </text>
            ))}

            {xTicks.map((t) => (
              <text key={t.i} x={px(t.i, n)} y={base + 19} textAnchor="middle" className="aw-rfa-xlab">
                {t.label}
              </text>
            ))}

            <g clipPath={`url(#aw-rfa-clip-${uid})`}>
              <path d={area} fill={`url(#aw-rfa-fill-${uid})`} />
              <path d={ghost} className="aw-rfa-ghost" />
              <path d={line} className="aw-rfa-line" />
            </g>

            <g className={`aw-rfa-readout${hover === null ? ' off' : ''}`}>
              <line x1={px(hi, n)} x2={px(hi, n)} y1={m.t} y2={base} className="aw-rfa-cross" />
              <circle cx={px(hi, n)} cy={py(prev[hi] ?? 0)} r={3.5} className="aw-rfa-ptp" />
              <circle cx={px(hi, n)} cy={py(cur[hi] ?? 0)} r={4.5} className="aw-rfa-ptc" />
            </g>

            <rect
              x={m.l}
              y={m.t}
              width={iw}
              height={ih}
              fill="transparent"
              className="aw-rfa-hit"
              onPointerDown={scrub}
              onPointerMove={scrub}
              onPointerLeave={leave}
            />
          </svg>

          {peak === 0 && <p className="aw-rfa-empty">{cfg.empty}</p>}
        </div>
      )}

      <ChartTip
        show={hover !== null}
        x={px(hi, n)}
        y={compact ? m.t - 8 : m.t}
        boxWidth={width}
        above={compact}
        center={compact}
      >
        <p className="aw-rfa-tip-k">Seven days ending</p>
        <p className="aw-rfa-tip-title">{fmtDay(calendar, day, { weekday: true, year: true })}</p>
        {milestoneName && <p className="aw-rfa-tip-feast">{milestoneName}</p>}
        <div className="aw-rfa-tip-grid aw-rfa-tip-cols">
          <span className="aw-rfa-sw-line" />
          <span>This year</span>
          <span className="aw-rfa-tip-num">{cfg.short(cur[hi] ?? 0)}</span>
          <span className="aw-rfa-sw-dash" />
          <span>Year before</span>
          <span>{cfg.short(prev[hi] ?? 0)}</span>
        </div>
        <div className="aw-rfa-tip-foot">
          Change
          <Delta cur={cur[hi] ?? 0} prev={prev[hi] ?? 0} invert={cfg.invert} />
        </div>
      </ChartTip>

      <p className="aw-rfa-sr" aria-live="polite">
        {hover !== null &&
          `Seven days ending ${fmtDay(calendar, day, { weekday: true })}${
            milestoneName ? `, ${milestoneName}` : ''
          }: ${cfg.short(cur[hi] ?? 0)} this year, ${cfg.short(prev[hi] ?? 0)} the year before.`}
      </p>
    </div>
  );
}

const DONUT_SIZE = 212;
const DONUT_C = DONUT_SIZE / 2;
const DONUT_R_OUT = 96;
const DONUT_R_IN = 66;
const TAU = Math.PI * 2;
const CAT_VARS = [
  'var(--series-a)',
  'var(--series-d)',
  'var(--accent-red)',
  'var(--series-c)',
  'var(--series-b)',
  'var(--ink-muted)',
];

function sector(a0: number, a1: number, rOut: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const pt = (r: number, a: number) =>
    `${(DONUT_C + r * Math.cos(a)).toFixed(2)},${(DONUT_C + r * Math.sin(a)).toFixed(2)}`;
  return `M${pt(rOut, a0)}A${rOut},${rOut} 0 ${large} 1 ${pt(rOut, a1)}L${pt(DONUT_R_IN, a1)}A${DONUT_R_IN},${DONUT_R_IN} 0 ${large} 0 ${pt(DONUT_R_IN, a0)}Z`;
}

function CostDonut({ items, meterCount }: { items: RollingSlice[]; meterCount: number }) {
  const target = useMemo(() => [items.map((i) => i.cur)], [items]);
  const [shown] = useTweenSeries(target);
  const sweepTarget = useMemo(() => [[1]], []);
  const [[sweepIn]] = useTweenSeries(sweepTarget, { duration: 700 });

  const { ref, width, tip, at, show, hide } = useTip();
  const [hot, setHot] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = tip?.i ?? hot ?? pinned;

  const total = items.reduce((s, i) => s + i.cur, 0);
  const shownTotal = shown.reduce((s, v) => s + v, 0);
  const share = (v: number) => (total > 0 ? fmtPct(v / total) : '—');

  let angle = -Math.PI / 2;
  const arcs = shown.map((v) => {
    const sweep = shownTotal > 0 ? Math.min((v / shownTotal) * TAU * sweepIn, TAU - 0.001) : 0;
    const a0 = angle;
    angle += sweep;
    const pad = sweep > 0.1 ? 0.012 : 0;
    return { a0: a0 + pad, a1: angle - pad, sweep };
  });

  const focus = active !== null ? items[active] ?? null : null;
  const tipItem = items[at.i] ?? items[0];
  const upper = at.y < DONUT_C;

  return (
    <div ref={ref} className="aw-rfa-donut">
      <div className="aw-rfa-donut-c" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <svg
          width={DONUT_SIZE}
          height={DONUT_SIZE}
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          className="aw-rfa-svg"
          role="img"
          aria-label={`Water spend breakdown: ${items.map((i) => `${i.label} ${fmtInrShort(i.cur)}`).join('; ')}.`}
        >
          {total === 0 && (
            <circle
              cx={DONUT_C}
              cy={DONUT_C}
              r={(DONUT_R_OUT + DONUT_R_IN) / 2}
              fill="none"
              strokeWidth={DONUT_R_OUT - DONUT_R_IN}
              className="aw-rfa-ring"
            />
          )}
          {arcs.map(
            (arc, i) =>
              arc.sweep > 0.004 && (
                <path
                  key={items[i].id}
                  d={sector(arc.a0, arc.a1, active === i ? DONUT_R_OUT + 5 : DONUT_R_OUT)}
                  fill={CAT_VARS[i % CAT_VARS.length]}
                  className={`aw-rfa-arc${active !== null && active !== i ? ' dim' : ''}`}
                  onPointerDown={show(i)}
                  onPointerMove={show(i)}
                  onPointerLeave={hide}
                  onClick={() => setPinned(pinned === i ? null : i)}
                />
              ),
          )}
        </svg>
        <div className="aw-rfa-hole">
          <span className="aw-rfa-hole-k">{focus ? focus.label : 'All charges'}</span>
          <span className="aw-rfa-hole-v">
            <Parts parts={fmtInrParts(focus ? focus.cur : shownTotal)} />
          </span>
          <span className="aw-rfa-hole-s">
            {total === 0
              ? 'no charges'
              : focus
              ? `${share(focus.cur)} of spend`
              : `across ${meterCount} meters`}
          </span>
        </div>
      </div>

      <ul className="aw-rfa-legend">
        {items.map((it, i) => (
          <li key={it.id}>
            <button
              type="button"
              aria-pressed={pinned === i}
              title={it.note}
              onClick={() => setPinned(pinned === i ? null : i)}
              onPointerEnter={() => setHot(i)}
              onPointerLeave={() => setHot(null)}
              onFocus={() => setHot(i)}
              onBlur={() => setHot(null)}
              className={`aw-rfa-li${active === i ? ' on' : ''}${active !== null && active !== i ? ' dim' : ''}`}
            >
              <span
                aria-hidden="true"
                className="aw-rfa-li-sw"
                style={{ background: CAT_VARS[i % CAT_VARS.length] }}
              />
              <span className="aw-rfa-li-name">{it.label}</span>
              <span className="aw-rfa-li-val">{fmtInrShort(it.cur)}</span>
              <span className="aw-rfa-li-pct">{share(it.cur)}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="aw-rfa-sum">
        <span className="aw-rfa-summa">Tariff benchmark: ₹0.025 / L</span>
        Computed on metered hydraulic volume; INA219 electrical charges excluded until calibration.
      </p>

      {tipItem && (
        <ChartTip
          show={tip !== null}
          x={at.x}
          y={upper ? 0 : DONUT_SIZE}
          boxWidth={width}
          width={208}
          above={upper}
          center
        >
          <div className="aw-rfa-tip-row">
            <p className="aw-rfa-tip-title">{tipItem.label}</p>
            <Delta cur={tipItem.cur} prev={tipItem.prev} invert />
          </div>
          <p className="aw-rfa-tip-note">{tipItem.note}</p>
          <p className="aw-rfa-tip-prev">
            Year before <span>{fmtInrShort(tipItem.prev)}</span>
          </p>
        </ChartTip>
      )}
    </div>
  );
}

function DriverBars({ items }: { items: RollingSlice[] }) {
  const on = useMounted();
  const { ref, width, tip, at, show, hide } = useTip();
  const peak = Math.max(1, ...items.map((i) => Math.max(i.cur, i.prev)));
  const total = items.reduce((s, i) => s + i.cur, 0);
  const roomy = width >= 330;
  const tipItem = items[at.i] ?? items[0];

  return (
    <div ref={ref} className="aw-rfa-tasks">
      <ul>
        {items.map((t, i) => (
          <li
            key={t.id}
            onPointerDown={show(i)}
            onPointerMove={show(i)}
            onPointerLeave={hide}
            className={`aw-rfa-task${tip?.i === i ? ' on' : ''}`}
          >
            <span className="aw-rfa-t-name">{t.label}</span>
            <span aria-hidden="true" className="aw-rfa-t-bar">
              <span className="aw-rfa-t-fill" style={{ width: on ? `${(t.cur / peak) * 100}%` : 0 }} />
              {t.prev > 0 && (
                <span
                  className="aw-rfa-t-mark"
                  style={{ left: on ? `calc(${(t.prev / peak) * 100}% - 1px)` : 0 }}
                />
              )}
            </span>
            <span className="aw-rfa-t-nums">
              <span className="aw-rfa-t-n">{fmtLitersShort(t.cur)}</span>
              {roomy && <span className="aw-rfa-t-d">{signedPct(t.cur, t.prev)}</span>}
            </span>
            <span className="aw-rfa-sr">
              {fmtLitersShort(t.cur)} this period; {fmtLitersShort(t.prev)} in the year before.
            </span>
          </li>
        ))}
      </ul>
      {total === 0 && <p className="aw-rfa-hint">No driver intake logged in this period.</p>}

      {tipItem && (
        <ChartTip show={tip !== null} x={at.x} y={at.y - 14} boxWidth={width} above>
          <TipBody
            item={tipItem}
            cur={fmtLitersShort(tipItem.cur)}
            prev={fmtLitersShort(tipItem.prev)}
            share={total > 0 ? fmtPct(tipItem.cur / total) : undefined}
          />
        </ChartTip>
      )}
    </div>
  );
}

function SubsystemBars({ items }: { items: RollingSlice[] }) {
  const on = useMounted();
  const { ref, width, tip, at, show, hide } = useTip();
  const ticks = niceTicks(Math.max(1, ...items.map((i) => Math.max(i.cur, i.prev))), 4);
  const top = ticks[ticks.length - 1] ?? 1;
  const tall = (v: number) => (on ? `${Math.max(v > 0 ? 1.5 : 0, (v / top) * 100)}%` : '0%');
  const tipItem = items[at.i] ?? items[0];

  return (
    <div ref={ref} className="aw-rfa-grain">
      <div className="aw-rfa-g-plot">
        {ticks.map((t) => (
          <div key={t} aria-hidden="true" className="aw-rfa-g-tick" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className={`aw-rfa-g-lab${t === 0 ? ' zero' : ''}`}>{fmtLitersAxis(t)}</span>
            <span className={`aw-rfa-g-line${t === 0 ? ' zero' : ''}`} />
          </div>
        ))}
        <ul className="aw-rfa-g-cols">
          {items.map((c, i) => (
            <li
              key={c.id}
              onPointerDown={show(i)}
              onPointerMove={show(i)}
              onPointerLeave={hide}
              className={`aw-rfa-g-col${tip?.i === i ? ' on' : ''}`}
            >
              <span aria-hidden="true" className="aw-rfa-g-bar cur" style={{ height: tall(c.cur) }} />
              <span aria-hidden="true" className="aw-rfa-g-bar prev" style={{ height: tall(c.prev) }} />
              <span className="aw-rfa-sr">
                {c.label}: {fmtLitersShort(c.cur)} reclaimed this period, {fmtLitersShort(c.prev)} in the year before.
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ul aria-hidden="true" className="aw-rfa-g-labels">
        {items.map((c) => (
          <li key={c.id} className="aw-rfa-g-label">
            {c.label}
          </li>
        ))}
      </ul>

      {tipItem && (
        <ChartTip show={tip !== null} x={at.x} y={at.y - 14} boxWidth={width} above>
          <TipBody
            item={tipItem}
            cur={fmtLitersShort(tipItem.cur)}
            prev={fmtLitersShort(tipItem.prev)}
          />
        </ChartTip>
      )}
    </div>
  );
}

type SortKey =
  | 'name'
  | 'cohort'
  | 'capLitersDay'
  | 'intakeLiters'
  | 'adherenceRatio'
  | 'costInr'
  | 'reclaimedLiters'
  | 'standing';

const COLUMNS: { key: SortKey; label: string; right?: boolean; first: 1 | -1 }[] = [
  { key: 'name', label: 'Meter Node', first: 1 },
  { key: 'cohort', label: 'Cohort', first: 1 },
  { key: 'capLitersDay', label: 'Daily Cap', right: true, first: -1 },
  { key: 'intakeLiters', label: 'Draw / Cap', right: true, first: -1 },
  { key: 'adherenceRatio', label: 'Load vs Cap', first: -1 },
  { key: 'costInr', label: 'Est. Cost', right: true, first: -1 },
  { key: 'reclaimedLiters', label: 'Reclaimed', right: true, first: -1 },
  { key: 'standing', label: 'Standing', first: 1 },
];

const STANDING_META: Record<MeterStanding, { label: string; tone: string }> = {
  optimal: { label: 'Optimal', tone: 'ok' },
  watch: { label: 'Watch', tone: 'behind' },
  overcap: { label: 'Over Cap', tone: 'bad' },
  idle: { label: 'Idle', tone: 'none' },
};

const STANDING_ORDER: Record<MeterStanding, number> = {
  overcap: 0,
  watch: 1,
  optimal: 2,
  idle: 3,
};
const STANDING_FILTERS: ('all' | MeterStanding)[] = ['all', 'optimal', 'watch', 'overcap'];
const PAGE_SIZE = 10;

function compareRows(a: FacilityMeterRow, b: FacilityMeterRow, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'cohort':
      return a.cohort - b.cohort || b.capLitersDay - a.capLitersDay;
    case 'standing':
      return (
        STANDING_ORDER[a.standing] - STANDING_ORDER[b.standing] ||
        (b.adherenceRatio ?? 0) - (a.adherenceRatio ?? 0)
      );
    case 'adherenceRatio':
      return (a.adherenceRatio ?? 0) - (b.adherenceRatio ?? 0);
    default:
      return a[key] - b[key];
  }
}

function SortGlyph({ dir }: { dir: 1 | -1 | 0 }) {
  return (
    <svg viewBox="0 0 8 12" className="aw-rfa-glyph" aria-hidden="true">
      <path d="M4 1 7 5H1Z" className={dir === 1 ? 'on' : ''} />
      <path d="M4 11 1 7h6Z" className={dir === -1 ? 'on' : ''} />
    </svg>
  );
}

function MeterLedgerTable({ rows }: { rows: FacilityMeterRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'adherenceRatio',
    dir: -1,
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | MeterStanding>('all');
  const [page, setPage] = useState(0);

  const q = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      q
        ? rows.filter((r) =>
            `${r.name} ${r.wing} ${COHORTS[r.cohort]?.one ?? ''}`.toLowerCase().includes(q),
          )
        : rows,
    [rows, q],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: matched.length, optimal: 0, watch: 0, overcap: 0, idle: 0 };
    for (const r of matched) c[r.standing]++;
    return c;
  }, [matched]);

  const sorted = useMemo(() => {
    const list = status === 'all' ? [...matched] : matched.filter((r) => r.standing === status);
    return list.sort((a, b) => {
      if (sort.key === 'adherenceRatio' && (a.adherenceRatio === null) !== (b.adherenceRatio === null)) {
        return a.adherenceRatio === null ? 1 : -1;
      }
      return compareRows(a, b, sort.key) * sort.dir || a.name.localeCompare(b.name);
    });
  }, [matched, status, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtered = q !== '' || status !== 'all';

  const sortBy = (key: SortKey, first: 1 | -1) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: first }));
    setPage(0);
  };

  return (
    <div className="aw-rfa-card aw-rfa-table-card">
      <div className="aw-rfa-t-toolbar">
        <div className="aw-rfa-chead">
          <div>
            <h3 className="aw-rfa-ctitle">Facility Meter Ledger</h3>
            <p className="aw-rfa-csub">
              Per-node cap adherence, draw volume, and estimated tariff spend for the active window. Click any heading to sort.
            </p>
          </div>
        </div>
        <div className="aw-rfa-t-tools">
          <label className="aw-rfa-search">
            <span className="aw-rfa-sr">Filter meter nodes by name, wing or cohort</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Find meter or wing"
            />
          </label>
          <div className="aw-rfa-xscroll">
            <div role="group" aria-label="Filter by meter standing" className="aw-rfa-seg">
              {STANDING_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => {
                    setStatus(s);
                    setPage(0);
                  }}
                >
                  {s === 'all' ? 'All' : STANDING_META[s].label}
                  <span className="aw-rfa-chip-n">{counts[s]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="aw-rfa-t-wrap">
        <table className="aw-rfa-table">
          <caption className="aw-rfa-sr">
            Facility meters in view, showing cohort, daily cap, period intake, adherence percentage, estimated cost, reclaimed volume, and standing
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((c, i) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                    className={`aw-rfa-th${c.right ? ' r' : ''}${i === 0 ? ' c1' : ''}${
                      i === COLUMNS.length - 1 ? ' cl' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(c.key, c.first)}
                      className={`aw-rfa-sort${active ? ' on' : ''}${c.right ? ' r' : ''}`}
                    >
                      {c.label}
                      <SortGlyph dir={active ? sort.dir : 0} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="aw-rfa-cell-name">
                  <span className="aw-rfa-name-t">
                    {r.name}
                    {r.provenance === 'physical' && (
                      <span className="aw-rfa-phys-tag">FS-S401</span>
                    )}
                  </span>
                  <span className="aw-rfa-end">{r.wing}</span>
                </th>
                <td className="aw-rfa-td">{COHORTS[r.cohort]?.one ?? 'Node'}</td>
                <td className="aw-rfa-td r num">{fmtInt(r.capLitersDay)} L/d</td>
                <td className="aw-rfa-td r num">
                  {r.capTotalLiters > 0 ? (
                    <>
                      <span className="aw-rfa-strong">{fmtLitersShort(r.intakeLiters)}</span>
                      <span className="aw-rfa-dim"> / {fmtLitersShort(r.capTotalLiters)}</span>
                    </>
                  ) : (
                    <span className="aw-rfa-dim">—</span>
                  )}
                </td>
                <td className="aw-rfa-td">
                  {r.adherenceRatio === null ? (
                    <span className="aw-rfa-dim">—</span>
                  ) : (
                    <span className="aw-rfa-rate">
                      <span aria-hidden="true" className="aw-rfa-r-bar">
                        <span
                          className={`aw-rfa-r-fill ${STANDING_META[r.standing].tone}`}
                          style={{ width: `${Math.min(100, Math.round(r.adherenceRatio * 100))}%` }}
                        />
                      </span>
                      <span className="aw-rfa-r-n">{Math.round(r.adherenceRatio * 100)}%</span>
                    </span>
                  )}
                </td>
                <td className="aw-rfa-td r num">{fmtInrShort(r.costInr)}</td>
                <td className="aw-rfa-td r num">{fmtLitersShort(r.reclaimedLiters)}</td>
                <td className="aw-rfa-td cl">
                  <span className="aw-rfa-stand">
                    <span aria-hidden="true" className={`aw-rfa-dot ${STANDING_META[r.standing].tone}`} />
                    {STANDING_META[r.standing].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="aw-rfa-empty-box">
            <p className="aw-rfa-empty-t">No meter nodes match that filter</p>
            <p className="aw-rfa-empty-s">
              {filtered
                ? 'Nothing matches the search and standing selected. Clear them to restore all meters in view.'
                : 'No meter nodes fall within the active cohort selection.'}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setPage(0);
                }}
                className="aw-rfa-clear"
              >
                Clear search and standing
              </button>
            )}
          </div>
        )}
      </div>

      <div className="aw-rfa-t-foot">
        <p className="aw-rfa-count" aria-live="polite">
          {sorted.length === 0
            ? 'No meter nodes'
            : `${current * PAGE_SIZE + 1}–${current * PAGE_SIZE + visible.length} of ${sorted.length} ${
                sorted.length === 1 ? 'meter' : 'meters'
              }`}
        </p>
        <div className="aw-rfa-pages">
          <span className="aw-rfa-page-n">
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="aw-rfa-pager"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className="aw-rfa-pager"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Lede({ store, view }: { store: RollingDatasetStore; view: RollingAccountView }) {
  const { calendar } = store;
  const { capTotal, totals, rows, days, to, drivers } = view;
  const until = fmtDay(calendar, to, { year: true });
  const lead = days === calendar.yearDays ? 'Across the rolling year' : `In the ${days} days to ${until}`;
  const n = rows.length;

  if (capTotal.cur === 0 || n === 0) {
    return (
      <>
        {lead}, no intake volume fell within the selected filter scope ({n} active meters).
      </>
    );
  }

  const overCapCount = rows.filter((r) => r.standing === 'overcap').length;
  const topDriver = drivers.reduce((a, b) => (b.cur > a.cur ? b : a), drivers[0]);

  return (
    <>
      {lead}, {n} monitored meter nodes drew <b>{fmtLitersShort(totals.intake.cur)}</b> against a{' '}
      <b>{fmtLitersShort(capTotal.cur)}</b> allocated ceiling ({fmtPct(totals.intake.cur / capTotal.cur)}).{' '}
      {topDriver ? `${topDriver.label} led total volume, ` : ''}and{' '}
      {overCapCount === 0
        ? 'zero meters exceeded their daily cap.'
        : overCapCount === 1
        ? '1 meter is currently over cap.'
        : `${overCapCount} meters are currently over cap.`}
    </>
  );
}

const EVERYONE = COHORTS.map((c) => c.id);

export const RollingFacilityAccountSection: React.FC<RollingFacilityAccountSectionProps> = ({
  sourceMode,
  physicalSnapshot,
  isLoadingPhysical,
  onRefreshPhysical,
  onSwitchToHybrid,
}) => {
  const store = useMemo(
    () =>
      buildRollingDatasetStore({
        sourceMode,
        physicalSnapshot,
      }),
    [sourceMode, physicalSnapshot],
  );

  const { calendar } = store;
  const [range, setRange] = useState<{ from: number; to: number }>({
    from: calendar.firstDay,
    to: calendar.lastDay,
  });
  const [segs, setSegs] = useState<number[]>([]);
  const [metric, setMetric] = useState<RollingMetricId>('intake');

  const safeFrom = clamp(range.from, calendar.firstDay, calendar.lastDay);
  const safeTo = clamp(range.to, safeFrom, calendar.lastDay);

  const inView = useMemo(() => (segs.length ? segs : EVERYONE), [segs]);
  const view = useMemo(
    () => buildRollingView(store, safeFrom, safeTo, inView),
    [store, safeFrom, safeTo, inView],
  );
  const shape = useMemo(() => buildYearShape(store, metric, inView), [store, metric, inView]);
  const onRange = useCallback((from: number, to: number) => setRange({ from, to }), []);

  const settled = useDebounced(view, 600);

  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const updatePinned = () => {
      const sec = sectionRef.current;
      const pan = panelRef.current;
      if (!sec || !pan) {
        setPinned(false);
        return;
      }
      const secRect = sec.getBoundingClientRect();
      const panRect = pan.getBoundingClientRect();
      const panelScrolledPast = panRect.bottom < 54;
      const stillInsideSection = secRect.bottom > 220;
      setPinned(panelScrolledPast && stillInsideSection);
    };

    updatePinned();
    window.addEventListener('scroll', updatePinned, { passive: true });
    window.addEventListener('resize', updatePinned, { passive: true });
    return () => {
      window.removeEventListener('scroll', updatePinned);
      window.removeEventListener('resize', updatePinned);
    };
  }, []);

  const cfg = METRICS[metric];
  const provenanceTone = store.provenance === 'physical' ? 'is-physical' : 'is-demo';
  const provenanceLabel =
    store.provenance === 'physical'
      ? 'VERIFIED PHYSICAL (FS-S401)'
      : store.provenance === 'mixed'
      ? 'HYBRID · FS-S401 + FLEET MODEL'
      : 'DEMO ROLLING ACCOUNT';

  return (
    <section
      id="s10"
      ref={sectionRef}
      className="spread aw-rfa-spread"
      aria-labelledby="s10-heading"
    >
      <div className="folio-line">
        <span>ANNUAL ROLLING HYDRAULIC & TARIFF ACCOUNT</span>
        <span>SECTION 10 / 10 · ROLLING BI</span>
      </div>

      {pinned && (
        <SlimFilters
          store={store}
          from={safeFrom}
          to={safeTo}
          segs={segs}
          onRange={onRange}
          onSegs={setSegs}
        />
      )}

      <div className="aw-rfa-wrap">
        <div className="aw-rfa-hero">
          <div className="kicker">
            <span>
              10 · ROLLING FACILITY ACCOUNT AS OF{' '}
              <time dateTime={calendar.todayIso}>{fmtDay(calendar, calendar.lastDay, { year: true })}</time>
            </span>
            <span className={`provenance-mark ${provenanceTone}`}>
              <i aria-hidden="true" />
              {provenanceLabel}
            </span>
          </div>

          <h2 id="s10-heading" className="title title-md">
            Rolling Year-over-Year Resource Ledger.
          </h2>

          {!store.emptyPhysicalReason && (
            <>
              <p aria-hidden="true" className="aw-rfa-lede">
                <Lede store={store} view={view} />
              </p>
              <p className="aw-rfa-sr" aria-live="polite">
                <Lede store={store} view={settled} />
              </p>
            </>
          )}
        </div>

        {store.emptyPhysicalReason ? (
          <div className="aw-rfa-card aw-rfa-pad aw-rfa-empty-state">
            <p className="aw-rfa-ctitle">No Verified Physical Readings Found in Supabase</p>
            <p className="aw-rfa-csub" style={{ maxWidth: '62ch' }}>
              {store.emptyPhysicalReason} Connect your ESP32 + FS-S401 pulse node to populate live rolling timelines, or switch to Hybrid Audit to explore multi-zone fleet comparisons. INA219 electrical metrics remain strictly excluded until hardware calibration completes.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onRefreshPhysical}
                disabled={isLoadingPhysical}
                className="seg-btn border inline-flex items-center gap-1.5"
                style={{ borderColor: 'var(--rule)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPhysical ? 'animate-spin' : ''}`} />
                Sync Supabase
              </button>
              <button type="button" onClick={onSwitchToHybrid} className="seg-btn is-active">
                Switch to Hybrid Audit
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="aw-rfa-panel" ref={panelRef}>
              <FilterPanel
                store={store}
                from={safeFrom}
                to={safeTo}
                segs={segs}
                shape={shape}
                onRange={onRange}
                onSegs={setSegs}
              />
            </div>

            <KpiRow view={view} metric={metric} onSelect={setMetric} />

            <div className="aw-rfa-card aw-rfa-pad aw-rfa-trend-card">
              <header className="aw-rfa-chead">
                <div>
                  <h3 className="aw-rfa-ctitle">{cfg.chart}</h3>
                  <p className="aw-rfa-csub">
                    Each point totals the trailing seven days ending on that date. Select any KPI card above to switch series.
                  </p>
                </div>
                <YearKey kind="line" />
              </header>
              <TrendChart
                calendar={calendar}
                metric={metric}
                cur={view.rolling[metric].cur}
                prev={view.rolling[metric].prev}
                from={view.from}
              />
            </div>

            <div className="aw-rfa-cards3">
              <div className="aw-rfa-card aw-rfa-pad aw-rfa-col">
                <header className="aw-rfa-chead">
                  <div>
                    <h3 className="aw-rfa-ctitle">Water Spend by Charge</h3>
                    <p className="aw-rfa-csub">
                      Tariff & surcharge breakdown. Click a slice to pin it in focus.
                    </p>
                  </div>
                </header>
                <CostDonut items={view.costCategories} meterCount={view.rows.length} />
              </div>

              <div className="aw-rfa-card aw-rfa-pad aw-rfa-col">
                <header className="aw-rfa-chead">
                  <div>
                    <h3 className="aw-rfa-ctitle">Intake by Operational Driver</h3>
                    <p className="aw-rfa-csub">Volume allocation vs prior-year vertical markers.</p>
                  </div>
                  <YearKey kind="mark" />
                </header>
                <DriverBars items={view.drivers} />
              </div>

              <div className="aw-rfa-card aw-rfa-pad aw-rfa-col aw-rfa-grain-card">
                <header className="aw-rfa-chead">
                  <div>
                    <h3 className="aw-rfa-ctitle">Reclaimed Volume by Subsystem</h3>
                    <p className="aw-rfa-csub">Recovered & under-cap liters against prior year.</p>
                  </div>
                  <YearKey />
                </header>
                <SubsystemBars items={view.subsystems} />
              </div>
            </div>

            <MeterLedgerTable rows={view.rows} />

            <footer className="aw-rfa-note">
              <p>
                Figures compare the selected trailing window against identical calendar dates one year prior. Tariff estimates apply the AquaWatt INR water benchmark (₹0.025/L). Confirmed physical telemetry comes exclusively from ESP32 GPIO34 FS-S401 Hall turbine meters; INA219 electrical kWh metrics remain calibration-pending (null).
              </p>
            </footer>
          </>
        )}
      </div>
    </section>
  );
};
