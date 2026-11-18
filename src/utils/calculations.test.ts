import test from 'node:test';
import assert from 'node:assert/strict';
import {
  litersToGallons,
  gallonsToLiters,
  formatMetric,
  formatCurrency,
  calculateResourceCost,
  calculateCarbonAvoided,
  calculatePercentageChange,
  detectAnomaly,
  evaluateSustainabilityScore,
} from './calculations';
import { telemetryService } from '../services/telemetryService';
import { HOURLY_24H_DATA } from '../data/mockData';

test('conversion between liters and gallons maintains reciprocal accuracy', () => {
  const liters = 100;
  const gallons = litersToGallons(liters);
  assert.equal(gallons, 26.4);
  const backToLiters = gallonsToLiters(gallons);
  assert.ok(Math.abs(backToLiters - liters) < 0.2);
});

test('formatMetric formats thousands and millions cleanly', () => {
  assert.equal(formatMetric(450), '450.0');
  assert.equal(formatMetric(1420), '1.4k');
  assert.equal(formatMetric(2500000), '2.5M');
});

test('formatCurrency formats INR amounts with Rupee symbol and Indian numbering format', () => {
  assert.equal(formatCurrency(499), '₹499.00');
  assert.equal(formatCurrency(1499, '₹', 0), '₹1,499');
  assert.equal(formatCurrency(125000, '₹', 2), '₹1,25,000.00');
  assert.equal(formatCurrency(NaN), '₹0.00');
});

test('calculateResourceCost computes cost with service fees', () => {
  assert.equal(calculateResourceCost(250, 0.14, 10.0), 45.0);
  assert.equal(calculateResourceCost(0, 0.14, 5.0), 5.0);
  assert.equal(calculateResourceCost(-10, 0.14), 0);
});

test('calculateCarbonAvoided computes combined footprint from water and power', () => {
  const co2 = calculateCarbonAvoided(10000, 200);
  // water: 10000 * 0.00032 = 3.2
  // power: 200 * 0.385 = 77
  // total = 80.2
  assert.equal(co2, 80.2);
});

test('calculatePercentageChange handles increases, decreases and zero baselines', () => {
  const inc = calculatePercentageChange(150, 100);
  assert.equal(inc.isIncrease, true);
  assert.equal(inc.percent, 50);
  assert.equal(inc.label, '+50%');

  const dec = calculatePercentageChange(80, 100);
  assert.equal(dec.isIncrease, false);
  assert.equal(dec.percent, 20);
  assert.equal(dec.label, '-20%');

  const zero = calculatePercentageChange(50, 0);
  assert.equal(zero.label, '+100%');
});

test('detectAnomaly triggers warning and critical severities above sensitivity', () => {
  const baseline = 10;
  const normal = detectAnomaly(12, baseline);
  assert.equal(normal.isAnomaly, false);
  assert.equal(normal.severity, 'normal');

  const warning = detectAnomaly(14, baseline); // 1.4x > 1.35
  assert.equal(warning.isAnomaly, true);
  assert.equal(warning.severity, 'warning');

  const critical = detectAnomaly(22, baseline); // 2.2x >= 1.35 * 1.5 = 2.025
  assert.equal(critical.isAnomaly, true);
  assert.equal(critical.severity, 'critical');
});

test('evaluateSustainabilityScore calculates bounded composite scores', () => {
  const score = evaluateSustainabilityScore(10, 15, 0, 2);
  // 50 + 12 + 18 - 0 + 8 = 88
  assert.equal(score, 88);

  const lowScore = evaluateSustainabilityScore(-15, -15, 4, 0);
  // 50 - 15 - 15 - 20 + 0 = 0 -> clamped to 10
  assert.equal(lowScore, 10);
});

test('telemetryService 8h metrics mathematically reconcile with HOURLY_24H_DATA shift slice', () => {
  const diurnal8h = telemetryService.getDiurnalData('8h');
  const metrics8h = telemetryService.getTimeRangeMetrics('8h');

  // Verify slice length (14:00 to 22:00 = 5 points)
  assert.equal(diurnal8h.length, 5);

  const sumWater = diurnal8h.reduce((acc, p) => acc + p.rawWaterLiters, 0);
  const sumPower = Number(diurnal8h.reduce((acc, p) => acc + p.rawElectricityKwh, 0).toFixed(1));

  assert.equal(metrics8h.totalWater, 248);
  assert.equal(sumWater, 248);
  assert.equal(metrics8h.totalPower, 11.2);
  assert.equal(sumPower, 11.2);
  assert.equal(metrics8h.waterSaved, 42);
  assert.equal(metrics8h.energySaved, 1.6);
});

test('telemetryService 24h metrics mathematically reconcile with full HOURLY_24H_DATA', () => {
  const diurnal24h = telemetryService.getDiurnalData('24h');
  const metrics24h = telemetryService.getTimeRangeMetrics('24h');

  assert.equal(diurnal24h.length, 12);

  const sumWater = diurnal24h.reduce((acc, p) => acc + p.rawWaterLiters, 0);
  const sumPower = Number(diurnal24h.reduce((acc, p) => acc + p.rawElectricityKwh, 0).toFixed(1));

  assert.equal(metrics24h.totalWater, 384);
  assert.equal(sumWater, 384);
  assert.equal(metrics24h.totalPower, 18.6);
  assert.equal(sumPower, 18.6);
  assert.equal(metrics24h.waterSaved, 72);
  assert.equal(metrics24h.energySaved, 2.8);
});

test('telemetryService 30d metrics reconcile with 10 billing buckets', () => {
  const diurnal30d = telemetryService.getDiurnalData('30d');
  const metrics30d = telemetryService.getTimeRangeMetrics('30d');

  assert.equal(diurnal30d.length, 10);

  const sumWater = diurnal30d.reduce((acc, p) => acc + p.rawWaterLiters, 0);
  const sumPower = Number(diurnal30d.reduce((acc, p) => acc + p.rawElectricityKwh, 0).toFixed(1));

  assert.equal(metrics30d.totalWater, 9840);
  assert.equal(sumWater, 9840);
  assert.equal(metrics30d.totalPower, 542.4);
  assert.equal(sumPower, 542.4);
});

test('telemetryService historical date filtering filters inclusive range and handles empty queries', () => {
  // Query full available range
  const records = telemetryService.getHistoricalDaily('2026-10-29', '2026-11-04');
  assert.equal(records.length, 7);
  assert.equal(records[0].date, '2026-10-29');
  assert.equal(records[6].date, '2026-11-04');

  // Query empty range (dates before 2026-10-01)
  const emptyBefore = telemetryService.getHistoricalDaily('2026-08-01', '2026-08-15');
  assert.equal(emptyBefore.length, 0);

  // Query single day
  const singleDay = telemetryService.getHistoricalDaily('2026-11-01', '2026-11-01');
  assert.equal(singleDay.length, 1);
  assert.equal(singleDay[0].dayName, 'Sun');
});

test('supabaseTelemetryService provides valid physical defaults with unmeasured INA219 fields', async () => {
  const { supabaseTelemetryService } = await import('../services/supabaseTelemetryService');
  const initialWater = supabaseTelemetryService.getInitialWaterReading();
  const initialPower = supabaseTelemetryService.getInitialElectricityReading();

  // Water validation: FS-S401 flow sensor
  assert.equal(initialWater.isPhysical, true);
  assert.equal(initialWater.isSimulated, false);
  assert.equal(initialWater.flowRateLpm, 0);
  assert.equal(initialWater.sensorModel, 'FS-S401');

  // Electrical validation: INA219 DC sensor is untested / unmeasured
  // MUST BE STRICTLY NULL to avoid fabricated telemetry
  assert.equal(initialPower.isPhysical, true);
  assert.equal(initialPower.isSimulated, false);
  assert.equal(initialPower.activePowerKw, null);
  assert.equal(initialPower.voltageVolts, null);
  assert.equal(initialPower.currentAmperes, null);
  assert.equal(initialPower.dailyTotalKwh, null);
  assert.equal(initialPower.sensorModel, 'INA219');
  assert.ok(initialPower.statusNote?.includes('INA219'));
});

test('supabaseTelemetryService preserves physical values without synthetic jitter', async () => {
  const { supabaseTelemetryService } = await import('../services/supabaseTelemetryService');
  const initialWater = supabaseTelemetryService.getInitialWaterReading();
  const initialPower = supabaseTelemetryService.getInitialElectricityReading();

  // Passing readings through physical service returns unmodified values
  const { nextWater, nextPower } = supabaseTelemetryService.createSimulatedJitter(initialWater, initialPower);
  assert.equal(nextWater.flowRateLpm, initialWater.flowRateLpm);
  assert.equal(nextWater.isSimulated, false);
  assert.equal(nextPower.activePowerKw, null);
  assert.equal(nextPower.isSimulated, false);
});

test('supabaseTelemetryService metrics return null power and energy for untested INA219 hardware', async () => {
  const { supabaseTelemetryService } = await import('../services/supabaseTelemetryService');
  const metrics = supabaseTelemetryService.getTimeRangeMetrics('24h');

  assert.equal(metrics.totalWater, 0);
  assert.equal(metrics.totalPower, null);
  assert.equal(metrics.energySaved, null);
  assert.equal(metrics.carbonAvoidedKg, null);
});

test('isSupabaseConfigured correctly identifies template placeholders as unconfigured', async () => {
  const { isSupabaseConfigured } = await import('../lib/supabase');
  // With placeholders in .env.local, isSupabaseConfigured must return false
  assert.equal(isSupabaseConfigured(), false);
});

test('checkSupabaseConnection gracefully returns unconfigured status when placeholders are present', async () => {
  const { checkSupabaseConnection } = await import('../lib/supabase');
  const result = await checkSupabaseConnection();

  assert.equal(result.isConfigured, false);
  assert.equal(result.isReachable, false);
  assert.equal(result.status, 'unconfigured');
  assert.ok(result.message.includes('placeholders') || result.message.includes('not configured'));
});

test('supabaseTelemetryService maps dailyTotalLiters and monthlyTotalLiters correctly in getTimeRangeMetrics', async () => {
  const { supabaseTelemetryService } = await import('../services/supabaseTelemetryService');
  const mockWaterReading = {
    ...supabaseTelemetryService.getInitialWaterReading(),
    flowRateLpm: 3.4,
    dailyTotalLiters: 1250.5,
    monthlyTotalLiters: 34200.0,
  };

  const metrics24h = supabaseTelemetryService.getTimeRangeMetrics('24h', mockWaterReading);
  assert.equal(metrics24h.totalWater, 1250.5);
  assert.equal(metrics24h.totalPower, null); // INA219 strictly unmeasured / null

  const metrics30d = supabaseTelemetryService.getTimeRangeMetrics('30d', mockWaterReading);
  assert.equal(metrics30d.totalWater, 34200.0);
  assert.equal(metrics30d.totalPower, null); // INA219 strictly unmeasured / null
});


