import React from 'react';
import { ArrowUpRight, ArrowDownRight, Info, LucideIcon } from 'lucide-react';
import { computeGoalProgress } from '../../utils/dashboardMetrics';

export type KpiColorVariant = 'blue' | 'amber' | 'emerald' | 'violet';

export interface KpiGoalConfig {
  current: number | null;
  target: number;
  unit?: string;
  targetLabel: string;
  accent?: 'water' | 'power' | 'eco';
}

interface KpiCardProps {
  title: string;
  value: string | number;
  unit: string;
  comparisonText: string;
  percentChange: number | null;
  isIncrease: boolean;
  isPositiveOutcome: boolean;
  deltaPolarity?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  sparklineData?: number[];
  hideSparkline?: boolean;
  isHighlightedGreen?: boolean;
  accentVariant?: KpiColorVariant;
  infoTooltip?: string;
  goal?: KpiGoalConfig;
  secondaryMetric?: {
    label: string;
    value: string;
  };
}

interface VariantTheme {
  card: string;
  iconBox: string;
  divider: string;
  track: string;
  fill: string;
  goalMetText: string;
  strokeHex: string;
}

const KPI_VARIANT_THEMES: Record<KpiColorVariant, VariantTheme> = {
  blue: {
    card: 'bg-gradient-to-br from-sky-50/90 via-white to-white dark:from-sky-950/60 dark:via-[#0F1E35] dark:to-[#111B2D] border border-sky-200/90 dark:border-sky-800/70 hover:border-sky-300 dark:hover:border-sky-600/80',
    iconBox:
      'bg-sky-100/90 dark:bg-sky-900/50 border border-sky-200/80 dark:border-sky-700/60 text-sky-700 dark:text-sky-300',
    divider: 'border-sky-100/90 dark:border-sky-900/50',
    track: 'bg-sky-100/80 dark:bg-sky-950/70',
    fill: 'bg-sky-600 dark:bg-sky-400',
    goalMetText: 'text-sky-700 dark:text-sky-300 font-medium',
    strokeHex: '#0EA5E9',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50/90 via-white to-white dark:from-amber-950/50 dark:via-[#1C1A19] dark:to-[#121928] border border-amber-200/90 dark:border-amber-800/65 hover:border-amber-300 dark:hover:border-amber-600/80',
    iconBox:
      'bg-amber-100/90 dark:bg-amber-900/45 border border-amber-200/80 dark:border-amber-700/60 text-amber-700 dark:text-amber-300',
    divider: 'border-amber-100/90 dark:border-amber-900/45',
    track: 'bg-amber-100/80 dark:bg-amber-950/70',
    fill: 'bg-amber-500 dark:bg-amber-400',
    goalMetText: 'text-amber-700 dark:text-amber-300 font-medium',
    strokeHex: '#F59E0B',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50/90 via-white to-white dark:from-emerald-950/55 dark:via-[#0D211E] dark:to-[#111B2B] border border-emerald-200/90 dark:border-emerald-800/70 hover:border-emerald-300 dark:hover:border-emerald-600/80',
    iconBox:
      'bg-emerald-100/90 dark:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300',
    divider: 'border-emerald-100/90 dark:border-emerald-900/50',
    track: 'bg-emerald-100/80 dark:bg-emerald-950/70',
    fill: 'bg-emerald-600 dark:bg-emerald-400',
    goalMetText: 'text-emerald-700 dark:text-emerald-300 font-medium',
    strokeHex: '#10B981',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-50/90 via-white to-white dark:from-violet-950/55 dark:via-[#18172E] dark:to-[#111B2B] border border-violet-200/90 dark:border-violet-800/70 hover:border-violet-300 dark:hover:border-violet-600/80',
    iconBox:
      'bg-violet-100/90 dark:bg-violet-900/50 border border-violet-200/80 dark:border-violet-700/60 text-violet-700 dark:text-violet-300',
    divider: 'border-violet-100/90 dark:border-violet-900/50',
    track: 'bg-violet-100/80 dark:bg-violet-950/70',
    fill: 'bg-violet-600 dark:bg-violet-400',
    goalMetText: 'text-violet-700 dark:text-violet-300 font-medium',
    strokeHex: '#8B5CF6',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  comparisonText,
  percentChange,
  isIncrease,
  isPositiveOutcome,
  deltaPolarity,
  icon: Icon,
  sparklineData = [12, 14, 11, 15, 13, 10, 8],
  hideSparkline = false,
  isHighlightedGreen = false,
  accentVariant,
  infoTooltip,
  goal,
  secondaryMetric,
}) => {
  // Smooth SVG sparkline geometry
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 72;
  const height = 24;
  const step = width / Math.max(1, sparklineData.length - 1);

  const points = sparklineData.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  const resolvedTone =
    deltaPolarity ?? (isPositiveOutcome ? 'positive' : 'negative');

  const resolvedVariant: KpiColorVariant =
    accentVariant ??
    (isHighlightedGreen || goal?.accent === 'eco'
      ? 'emerald'
      : goal?.accent === 'power'
      ? 'amber'
      : 'blue');

  const theme = KPI_VARIANT_THEMES[resolvedVariant];

  const isUntested = value === '—' || value === '--';
  const strokeColor = isUntested ? '#94A3B8' : theme.strokeHex;

  const goalProgress = goal
    ? computeGoalProgress(goal.current, goal.target, goal.unit ?? '')
    : null;

  const sparkGradId = `spark-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      className={`relative rounded-xl ${theme.card} p-5 shadow-xs transition-colors flex flex-col justify-between`}
      title={infoTooltip}
    >
      <div>
        {/* Label + Tinted Icon Square */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {title}
              </span>
              {infoTooltip && (
                <span
                  title={infoTooltip}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help shrink-0"
                  aria-label={infoTooltip}
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
              <span className="text-[28px] leading-none font-semibold tracking-tight text-slate-900 dark:text-white font-mono">
                {value}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            </div>
          </div>

          <div
            className={`w-8 h-8 rounded-lg ${theme.iconBox} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {/* Delta + Sparkline */}
        <div className="mt-3.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {percentChange !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[11px] font-medium tabular-nums shrink-0 ${
                  resolvedTone === 'positive'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-400'
                    : resolvedTone === 'negative'
                    ? 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {resolvedTone !== 'neutral' &&
                  (isIncrease ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  ))}
                {percentChange}%
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                —
              </span>
            )}
            <span className="truncate text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {comparisonText}
            </span>
          </div>

          {!isUntested && !hideSparkline && (
            <div className="relative w-[72px] h-6 shrink-0" aria-hidden="true">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id={sparkGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill={`url(#${sparkGradId})`} />
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={width}
                  cy={Number(points[points.length - 1].split(',')[1])}
                  r="2"
                  fill={strokeColor}
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bullet / Tick Goal Track or Compact Secondary Row */}
      <div className={`mt-3.5 pt-2.5 border-t ${theme.divider} space-y-2`}>
        {goal && goalProgress && (
          <div>
            <div className={`relative h-1.5 w-full rounded-full ${theme.track} overflow-visible`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isUntested ? 'bg-slate-300 dark:bg-slate-700' : theme.fill
                }`}
                style={{ width: `${goalProgress.barWidthPercent}%` }}
              />
              {/* Target tick mark */}
              <span
                className="absolute -top-0.5 bottom-0 h-2.5 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
                style={{ left: `${goalProgress.targetMarkerPercent}%` }}
                title={goal.targetLabel}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{goal.targetLabel}</span>
              <span
                className={
                  goalProgress.isMet && !isUntested
                    ? theme.goalMetText
                    : 'text-slate-500 dark:text-slate-400'
                }
              >
                {isUntested ? 'No data' : goalProgress.remainingLabel}
              </span>
            </div>
          </div>
        )}

        {secondaryMetric && (
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            <span>{secondaryMetric.label}</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {secondaryMetric.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
