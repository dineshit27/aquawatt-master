import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSensorNumber,
  formatSharePercent,
  formatDelta,
  computeGoalProgress,
  computeAnalyticsFinancials,
  summarizeActiveAlerts,
  resolveSubscriptionQueryParams,
} from './dashboardMetrics';

test('formatSensorNumber displays em-dash for untested or null readings', () => {
  assert.equal(formatSensorNumber(null), '—');
  assert.equal(formatSensorNumber(undefined), '—');
  assert.equal(formatSensorNumber(Number.NaN), '—');
  assert.equal(formatSensorNumber(3.2, 2), '3.20');
  assert.equal(formatSensorNumber(9840, 0, true), '9,840');
});

test('formatSharePercent distinguishes tiny non-zero shares below 0.1%', () => {
  assert.equal(formatSharePercent(0), '0%');
  assert.equal(formatSharePercent(0.04), '<0.1%');
  assert.equal(formatSharePercent(32), '32%');
  assert.equal(formatSharePercent(4.5), '4.5%');
});

test('formatDelta suppresses noisy percentage swings on small base counts (< 5)', () => {
  const tiny = formatDelta(0, 2, 'lower-is-better');
  assert.equal(tiny.label, 'was 2');
  assert.equal(tiny.tone, 'neutral');
  assert.equal(tiny.isSmallBase, true);
});

test('formatDelta assigns semantic tone for lower-is-better and higher-is-better', () => {
  const usageDrop = formatDelta(384, 447, 'lower-is-better');
  assert.equal(usageDrop.label, '−14.1%');
  assert.equal(usageDrop.tone, 'positive');

  const usageSpike = formatDelta(480, 400, 'lower-is-better');
  assert.equal(usageSpike.label, '+20%');
  assert.equal(usageSpike.tone, 'negative');

  const savingsUp = formatDelta(118.4, 100, 'higher-is-better');
  assert.equal(savingsUp.label, '+18.4%');
  assert.equal(savingsUp.tone, 'positive');

  const volumeNeutral = formatDelta(120, 100, 'neutral');
  assert.equal(volumeNeutral.tone, 'neutral');
});

test('computeGoalProgress reports target met and remaining budget accurately', () => {
  const partial = computeGoalProgress(84, 100, '%');
  assert.equal(partial.percentOfGoal, 84);
  assert.equal(partial.isMet, false);
  assert.equal(partial.remainingLabel, '16 % left');

  const met = computeGoalProgress(112, 100, 'L');
  assert.equal(met.percentOfGoal, 112);
  assert.equal(met.isMet, true);
  assert.equal(met.remainingLabel, '112% of goal');

  const missing = computeGoalProgress(null, 100, 'kWh');
  assert.equal(missing.barWidthPercent, 0);
  assert.equal(missing.remainingLabel, 'Awaiting data');
});

test('computeAnalyticsFinancials reconciles summary cost, spend donut, and kWh donut identically', () => {
  const defaultRates = computeAnalyticsFinancials(0.025, 7.5);
  assert.equal(defaultRates.projectedTotalCost, 4314);
  assert.equal(defaultRates.totalUtilitySpend, defaultRates.projectedTotalCost);
  assert.equal(defaultRates.totalMonthlyKwh, defaultRates.monthlyPowerKwh);

  const customRates = computeAnalyticsFinancials(0.045, 11.25);
  assert.equal(customRates.totalUtilitySpend, customRates.projectedTotalCost);
  assert.equal(
    Number((customRates.projectedWaterCost + customRates.projectedPowerCost).toFixed(2)),
    customRates.projectedTotalCost
  );
});

test('summarizeActiveAlerts avoids hardcoded mock figures in physical mode and computes exposure dynamically', () => {
  const physicalEmpty = summarizeActiveAlerts([], true);
  assert.equal(physicalEmpty.openCount, 0);
  assert.equal(physicalEmpty.estimatedLossLabel, '—');
  assert.equal(physicalEmpty.exposureInrLabel, '—');
  assert.equal(physicalEmpty.mttrLabel, '—');

  const activeElectricityOnly = summarizeActiveAlerts(
    [{ isResolved: false, resource: 'electricity', potentialCostImpact: 140 }],
    false
  );
  assert.equal(activeElectricityOnly.estimatedLossLabel, '0 L');
  assert.equal(activeElectricityOnly.exposureInrLabel, '₹140/mo');

  const activeWaterLeak = summarizeActiveAlerts(
    [
      {
        isResolved: false,
        resource: 'water',
        estimatedWastage: '~210 L/night',
        potentialCostImpact: 350,
      },
    ],
    false
  );
  assert.equal(activeWaterLeak.estimatedLossLabel, '~210 L/night');
  assert.equal(activeWaterLeak.exposureInrLabel, '₹350/mo');
});

test('resolveSubscriptionQueryParams maps home pricing tier slugs to canonical subscription plan IDs', () => {
  assert.deepEqual(resolveSubscriptionQueryParams('starter', 'monthly'), {
    planId: 'free',
    billingCycle: 'monthly',
  });
  assert.deepEqual(resolveSubscriptionQueryParams('standard-pro', 'yearly'), {
    planId: 'standard',
    billingCycle: 'yearly',
  });
  assert.deepEqual(resolveSubscriptionQueryParams('enterprise-eco', 'invalid'), {
    planId: 'premium',
    billingCycle: null,
  });
});

