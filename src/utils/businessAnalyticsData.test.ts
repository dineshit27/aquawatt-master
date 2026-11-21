import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBusinessExplorerCsvPayload,
  computeOLSRegression,
  computeTimelineTiers,
  escapeCsvCell,
  filterExplorerRows,
  paginateRows,
  sortExplorerRows,
} from './businessAnalyticsMath';
import { buildBusinessAnalyticsDataset } from '../services/businessAnalyticsService';
import type { BusinessExplorerRow, TimelineMilestone } from '../types/businessAnalytics';

describe('Business Analytics Math & Regression', () => {
  it('computes exact OLS slope, intercept, and R^2 for linear series', () => {
    const res = computeOLSRegression([
      { x: 10, y: 20 },
      { x: 20, y: 40 },
      { x: 30, y: 60 },
      { x: 40, y: 80 },
    ]);
    assert.ok(res);
    assert.equal(Number(res.slope.toFixed(6)), 2);
    assert.equal(Number(res.intercept.toFixed(6)), 0);
    assert.equal(Number(res.rSquared.toFixed(6)), 1);
    assert.equal(res.sampleSize, 4);
  });

  it('returns null when OLS has fewer than 3 points or zero X variance', () => {
    assert.equal(
      computeOLSRegression([
        { x: 10, y: 20 },
        { x: 20, y: 30 },
      ]),
      null
    );
    assert.equal(
      computeOLSRegression([
        { x: 50, y: 10 },
        { x: 50, y: 20 },
        { x: 50, y: 30 },
      ]),
      null
    );
  });

  it('assigns non-overlapping timeline tiers when milestones sit close horizontally', () => {
    const closeMilestones: TimelineMilestone[] = [
      { id: '1', date: 'Jan', yearNum: 2026.0, shortTitle: 'M1', fullTitle: 'Milestone 1', detail: 'D1' },
      { id: '2', date: 'Feb', yearNum: 2026.05, shortTitle: 'M2', fullTitle: 'Milestone 2', detail: 'D2' },
      { id: '3', date: 'Mar', yearNum: 2026.1, shortTitle: 'M3', fullTitle: 'Milestone 3', detail: 'D3' },
    ];
    const placed = computeTimelineTiers(closeMilestones, 2025.8, 2026.4, 680, 50, 50, 120);
    assert.equal(placed.length, 3);
    const tiers = new Set(placed.map(p => p.tier));
    assert.equal(tiers.size, 3);
  });

  it('neutralizes formula injection in CSV export cells and payload', () => {
    assert.equal(escapeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
    assert.equal(escapeCsvCell('+SUM(A1:A2)'), `"'${'+SUM(A1:A2)'}"`);
    assert.equal(escapeCsvCell(null), '""');
  });
});

describe('Explorer Filtering, Sorting, Pagination & Hardware Truthfulness', () => {
  const sampleRows: BusinessExplorerRow[] = [
    {
      id: '1',
      isoDate: '2026-11-04',
      facilityName: 'North Utility Bench',
      zone: 'North Utility Wing',
      sensorModel: 'FS-S401',
      flowRateLpm: 14.5,
      dailyLiters: 4120,
      monthlyLiters: 123600,
      utilizationPct: 86,
      sparkline: [12, 13, 14.5],
      ina219PowerKw: null,
      ina219Status: 'Calibration Pending',
      provenance: 'physical',
    },
    {
      id: '2',
      isoDate: '2026-10-12',
      facilityName: 'Chiller Cooling Tower',
      zone: 'Chiller Plant B',
      sensorModel: 'Simulated Meter',
      flowRateLpm: 28.4,
      dailyLiters: 11850,
      monthlyLiters: 355500,
      utilizationPct: 91,
      sparkline: [25, 27, 28.4],
      ina219PowerKw: null,
      ina219Status: 'Calibration Pending',
      provenance: 'demo',
    },
  ];

  it('filters by zone, search query, and date window cleanly', () => {
    const by7d = filterExplorerRows(sampleRows, {
      searchQuery: '',
      zoneFilter: 'ALL',
      dateFilter: '7d',
      referenceDateIso: '2026-11-05T00:00:00Z',
    });
    assert.equal(by7d.length, 1);
    assert.equal(by7d[0].id, '1');

    const sortedAsc = sortExplorerRows(sampleRows, 'dailyLiters', 'asc');
    assert.equal(sortedAsc[0].id, '1');

    const paged = paginateRows(sampleRows, 2, 1);
    assert.equal(paged.currentPage, 2);
    assert.equal(paged.totalPages, 2);
    assert.equal(paged.items[0].id, '2');
  });

  it('keeps Physical Only mode completely free of demo rows when Supabase returns 0 readings', () => {
    const ds = buildBusinessAnalyticsDataset({
      sourceMode: 'physical',
      reportingPeriod: '30d',
      physicalSnapshot: {
        readings: [],
        devices: [],
        alerts: [],
        fetchedAtIso: '2026-11-05T00:00:00.000Z',
        error: null,
      },
    });
    assert.equal(ds.effectiveProvenance, 'physical');
    assert.equal(ds.explorerRows.length, 0);
    assert.equal(ds.matrixUnits.length, 0);
    assert.equal(ds.overviewKpis.find(k => k.id === 'kpi-ina')?.value, 'Pending');
  });

  it('builds CSV export preserving null INA219 metrics and explicit provenance', () => {
    const payload = buildBusinessExplorerCsvPayload(sampleRows);
    assert.equal(payload.headers.includes('INA219 Power (kW)'), true);
    assert.equal(payload.records[0][8], null);
    assert.equal(payload.records[0][9], 'VERIFIED PHYSICAL (FS-S401)');
    assert.equal(payload.records[1][9], 'DEMO DATA');
  });
});
