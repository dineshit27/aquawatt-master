import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_7D_DATA, HOURLY_24H_DATA } from '../data/mockData';
import { computeAnalyticsFinancials } from './dashboardMetrics';
import {
  buildDiurnalHeatmap,
  buildSpendWaterfallSteps,
  buildTouCappedBars,
  buildCircuitBulletTargets,
  buildDailySpanRange,
} from './analyticsVisualizations';

test('buildDiurnalHeatmap reconciles strictly with DAILY_7D_DATA totals', () => {
  const summary = buildDiurnalHeatmap(DAILY_7D_DATA, HOURLY_24H_DATA);

  assert.equal(summary.days.length, 7);
  assert.equal(summary.hours.length, 12);

  const expectedWater = DAILY_7D_DATA.reduce((s, d) => s + d.waterCurrent, 0);
  const expectedPower = Number(
    DAILY_7D_DATA.reduce((s, d) => s + d.electricityCurrent, 0).toFixed(1)
  );

  assert.equal(summary.totalWaterLiters, expectedWater);
  assert.equal(summary.totalPowerKwh, expectedPower);
  assert.ok(summary.anomalyCount >= 2);
});

test('buildSpendWaterfallSteps bridges baseline identically to projectedTotalCost across tariffs', () => {
  for (const [wRate, eRate] of [
    [0.025, 7.5],
    [0.045, 11.0],
  ]) {
    const financials = computeAnalyticsFinancials(wRate, eRate);
    const steps = buildSpendWaterfallSteps(wRate, eRate);

    assert.equal(steps[0].id, 'baseline');
    assert.equal(steps[steps.length - 1].id, 'projected');
    assert.equal(steps[steps.length - 1].end, financials.projectedTotalCost);

    const summedDelta = Number(
      (
        steps[0].delta +
        steps.slice(1, -1).reduce((s, st) => s + st.delta, 0)
      ).toFixed(2)
    );
    assert.equal(summedDelta, financials.projectedTotalCost);

    if (wRate === 0.025 && eRate === 7.5) {
      assert.equal(steps[0].end - steps[steps.length - 1].end, 840);
    }
  }
});

test('buildTouCappedBars classifies peak/off-peak windows and flags 02:00 nocturnal drip', () => {
  const bars = buildTouCappedBars(HOURLY_24H_DATA, 0.025, 7.5);
  assert.equal(bars.length, 12);
  assert.equal(bars[0].tariffTier, 'off-peak'); // 00:00
  assert.equal(bars[1].isAnomaly, true);        // 02:00 leak 16L vs 4L
  assert.equal(bars[9].tariffTier, 'peak');     // 18:00
});

test('buildCircuitBulletTargets reconciles water to 9,840 L and power to 542.4 kWh', () => {
  const bullets = buildCircuitBulletTargets();
  const waterTotal = bullets
    .filter(b => b.resource === 'water')
    .reduce((s, b) => s + b.actual, 0);
  const powerTotal = Number(
    bullets
      .filter(b => b.resource === 'power')
      .reduce((s, b) => s + b.actual, 0)
      .toFixed(1)
  );

  assert.equal(waterTotal, 9840);
  assert.equal(powerTotal, 542.4);

  const garden = bullets.find(b => b.id === 'b_garden_w');
  assert.equal(garden?.isOverTarget, true);
});

test('buildDailySpanRange keeps min <= avg <= peak across all 7 days', () => {
  const spans = buildDailySpanRange(DAILY_7D_DATA);
  assert.equal(spans.length, 7);
  for (const s of spans) {
    assert.ok(s.powerMinKw <= s.powerAvgKw && s.powerAvgKw <= s.powerPeakKw);
    assert.ok(s.waterMinLph <= s.waterAvgLph && s.waterAvgLph <= s.waterPeakLph);
  }
});
