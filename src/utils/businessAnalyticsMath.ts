import {
  BusinessExplorerRow,
  OLSRegressionResult,
  TimelineMilestone,
} from '../types/businessAnalytics';

/**
 * Computes Ordinary Least Squares linear regression (y = slope * x + intercept)
 * plus coefficient of determination (R^2).
 * Returns null if sample size < 3 or X variance is zero to avoid misleading trendlines.
 */
export function computeOLSRegression(
  points: ReadonlyArray<{ x: number; y: number }>
): OLSRegressionResult | null {
  const n = points.length;
  if (n < 3) {
    return null;
  }

  let sumX = 0;
  let sumY = 0;
  for (const pt of points) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
    sumX += pt.x;
    sumY += pt.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssXY = 0;
  let ssYY = 0;

  for (const pt of points) {
    const dx = pt.x - meanX;
    const dy = pt.y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  if (ssXX === 0) {
    return null;
  }

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;

  let rSquared: number;
  if (ssYY > 0) {
    const r = ssXY / Math.sqrt(ssXX * ssYY);
    rSquared = Math.max(0, Math.min(1, r * r));
  } else {
    // Perfect constant Y line across variable X has zero residual error around horizontal line
    rSquared = 1;
  }

  return {
    slope,
    intercept,
    rSquared,
    sampleSize: n,
    meanX,
    meanY,
  };
}

/**
 * Linear scale helper mapping [domainMin, domainMax] to [rangeMin, rangeMax].
 */
export function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
): number {
  if (domainMax === domainMin) {
    return (rangeMin + rangeMax) / 2;
  }
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

/**
 * Computes collision-free tier levels (0, 1, 2, 3) for milestone timeline labels
 * based on horizontal distance so adjacent milestones never overlap horizontally.
 */
export function computeTimelineTiers(
  milestones: ReadonlyArray<TimelineMilestone>,
  minYear: number,
  maxYear: number,
  svgWidth: number,
  padLeft: number,
  padRight: number,
  minPixelGap = 112
): Array<TimelineMilestone & { x: number; tier: number }> {
  const usableWidth = Math.max(100, svgWidth - padLeft - padRight);
  const sorted = [...milestones].sort((a, b) => a.yearNum - b.yearNum);

  const tierRightEdge: number[] = [-Infinity, -Infinity, -Infinity, -Infinity];

  return sorted.map(m => {
    const x =
      maxYear === minYear
        ? padLeft + usableWidth / 2
        : padLeft + ((m.yearNum - minYear) / (maxYear - minYear)) * usableWidth;

    const halfWidth = minPixelGap / 2;
    const leftEdge = x - halfWidth;

    let chosenTier = 0;
    for (let t = 0; t < tierRightEdge.length; t++) {
      if (leftEdge >= tierRightEdge[t] + 10) {
        chosenTier = t;
        break;
      }
      if (t === tierRightEdge.length - 1) {
        // Pick tier with smallest last right edge if all 4 are crowded
        let bestTier = 0;
        for (let candidate = 1; candidate < tierRightEdge.length; candidate++) {
          if (tierRightEdge[candidate] < tierRightEdge[bestTier]) {
            bestTier = candidate;
          }
        }
        chosenTier = bestTier;
      }
    }

    tierRightEdge[chosenTier] = x + halfWidth;
    return {
      ...m,
      x,
      tier: chosenTier,
    };
  });
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactLiters(liters: number): string {
  if (!Number.isFinite(liters)) return '0 L';
  if (Math.abs(liters) >= 1_000_000) {
    return `${(liters / 1_000_000).toFixed(2)} ML`;
  }
  if (Math.abs(liters) >= 1_000) {
    return `${(liters / 1_000).toFixed(1)} kL`;
  }
  return `${Math.round(liters)} L`;
}

export type ExplorerSortKey =
  | 'facilityName'
  | 'isoDate'
  | 'flowRateLpm'
  | 'dailyLiters'
  | 'monthlyLiters'
  | 'utilizationPct';

export type SortDirection = 'asc' | 'desc';

export type ExplorerDateFilter = 'all' | '7d' | '14d' | '30d';

export function filterExplorerRows(
  rows: ReadonlyArray<BusinessExplorerRow>,
  options: {
    searchQuery: string;
    zoneFilter: string;
    dateFilter: ExplorerDateFilter;
    referenceDateIso?: string;
  }
): BusinessExplorerRow[] {
  const query = options.searchQuery.trim().toLowerCase();
  const refMs = Date.parse(options.referenceDateIso ?? '2026-11-05T00:00:00Z');
  const maxDays =
    options.dateFilter === '7d'
      ? 7
      : options.dateFilter === '14d'
      ? 14
      : options.dateFilter === '30d'
      ? 30
      : null;

  return rows.filter(row => {
    if (options.zoneFilter !== 'ALL' && row.zone !== options.zoneFilter) {
      return false;
    }

    if (query) {
      const hay = `${row.facilityName} ${row.zone} ${row.sensorModel} ${row.provenance}`.toLowerCase();
      if (!hay.includes(query)) {
        return false;
      }
    }

    if (maxDays !== null) {
      const rowMs = Date.parse(row.isoDate);
      if (Number.isFinite(rowMs) && Number.isFinite(refMs)) {
        const diffDays = (refMs - rowMs) / (1000 * 60 * 60 * 24);
        if (diffDays > maxDays || diffDays < -1) {
          return false;
        }
      }
    }

    return true;
  });
}

export function sortExplorerRows(
  rows: ReadonlyArray<BusinessExplorerRow>,
  sortKey: ExplorerSortKey,
  direction: SortDirection
): BusinessExplorerRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    let cmp: number;
    if (sortKey === 'facilityName' || sortKey === 'isoDate') {
      cmp = a[sortKey].localeCompare(b[sortKey]);
    } else {
      cmp = a[sortKey] - b[sortKey];
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return copy;
}

export function paginateRows<T>(
  rows: ReadonlyArray<T>,
  page: number,
  pageSize: number
): {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
} {
  const safeSize = Math.max(1, pageSize);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * safeSize;
  return {
    items: rows.slice(start, start + safeSize),
    currentPage,
    totalPages,
    totalItems,
  };
}

/**
 * Neutralizes spreadsheet formula injection prefixes (=, +, -, @, tab, cr)
 * and quotes CSV cells cleanly per RFC 4180.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildBusinessExplorerCsvPayload(rows: ReadonlyArray<BusinessExplorerRow>): {
  headers: string[];
  records: (string | number | null)[][];
} {
  const headers = [
    'Date',
    'Facility / Node',
    'Zone',
    'Water Sensor',
    'Flow Rate (L/min)',
    'Daily Consumption (L)',
    'Monthly Volume (L)',
    'Utilization (%)',
    'INA219 Power (kW)',
    'Data Provenance',
  ];

  const records = rows.map(r => [
    r.isoDate,
    r.facilityName,
    r.zone,
    r.sensorModel,
    Number(r.flowRateLpm.toFixed(2)),
    Number(r.dailyLiters.toFixed(1)),
    Number(r.monthlyLiters.toFixed(1)),
    Number(r.utilizationPct.toFixed(1)),
    r.ina219PowerKw, // strictly null when pending calibration
    r.provenance === 'physical' ? 'VERIFIED PHYSICAL (FS-S401)' : 'DEMO DATA',
  ]);

  return { headers, records };
}
