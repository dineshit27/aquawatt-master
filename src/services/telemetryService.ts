/**
 * Telemetry Service Abstraction for AquaWatt
 * 
 * Provides a decoupled data access interface separating UI components from the
 * telemetry data source. Currently provides simulated testbench data matching the
 * ESP32 + Wi-Fi + MQTT sensor topology.
 * 
 * Future Integration Targets:
 * - Direct MQTT broker WebSocket client (aquawatt/nodes/+/telemetry)
 * - Supabase Realtime / PostgreSQL edge tables
 */

import {
  WaterReading,
  ElectricityReading,
  SensorDevice,
  ConsumptionAlert,
  AIRecommendation,
  HourlyConsumptionPoint,
  DailyComparisonPoint,
} from '../types';
import {
  INITIAL_WATER_READING,
  INITIAL_ELECTRICITY_READING,
  SENSOR_DEVICES,
  INITIAL_ALERTS,
  INITIAL_AI_RECOMMENDATIONS,
  HOURLY_24H_DATA,
  DAILY_7D_DATA,
  HISTORICAL_DAILY_DATA,
  MONTHLY_12M_DATA,
} from '../data/mockData';

export interface ESP32NodePayload {
  nodeId: string;
  hardware: 'ESP32_WROOM_32' | 'ESP32_S3' | 'ESP32_DEVKIT';
  transport: 'WiFi_802.11bgn';
  protocol: 'MQTT';
  topic: string;
  serialBaud: 115200;
  pulseCount?: number;
  flowRateLpm?: number;
  ctAdcRaw?: number;
  activePowerW?: number;
  rssiDbm: number;
  timestamp: string;
  isSimulated: true;
}

export interface TimeRangeMetrics {
  totalWater: number;
  totalWaterUnit: string;
  totalPower: number | null;
  totalPowerUnit: string;
  waterSaved: number;
  energySaved: number | null;
  waterSavedCostInr: number;
  carbonAvoidedKg: number | null;
  waterComparison: string;
  powerComparison: string;
}

export interface DiurnalPoint {
  label: string;
  waterVal: number;
  electricVal: number;
  rawElectricityKwh: number;
  rawWaterLiters: number;
  waterCostInr: number;
  electricityCostInr: number;
}

export interface ITelemetryService {
  getInitialWaterReading(): WaterReading;
  getInitialElectricityReading(): ElectricityReading;
  getSensorNodes(): SensorDevice[];
  getInitialAlerts(): ConsumptionAlert[];
  getInitialRecommendations(): AIRecommendation[];
  getDiurnalData(timeRange?: '8h' | '24h' | '30d'): DiurnalPoint[];
  getWeeklyComparison(): DailyComparisonPoint[];
  getHistoricalDaily(startDate?: string, endDate?: string): DailyComparisonPoint[];
  getTimeRangeMetrics(timeRange: '8h' | '24h' | '30d', currentWater?: WaterReading): TimeRangeMetrics;
  createSimulatedJitter(prevWater: WaterReading, prevPower: ElectricityReading): {
    nextWater: WaterReading;
    nextPower: ElectricityReading;
  };
}

class MockTelemetryService implements ITelemetryService {
  getInitialWaterReading(): WaterReading {
    return { ...INITIAL_WATER_READING };
  }

  getInitialElectricityReading(): ElectricityReading {
    return { ...INITIAL_ELECTRICITY_READING };
  }

  getSensorNodes(): SensorDevice[] {
    return [...SENSOR_DEVICES];
  }

  getInitialAlerts(): ConsumptionAlert[] {
    return [...INITIAL_ALERTS];
  }

  getInitialRecommendations(): AIRecommendation[] {
    return [...INITIAL_AI_RECOMMENDATIONS];
  }

  getWeeklyComparison(): DailyComparisonPoint[] {
    return [...DAILY_7D_DATA];
  }

  getHistoricalDaily(startDate?: string, endDate?: string): DailyComparisonPoint[] {
    if (!startDate && !endDate) {
      return [...HISTORICAL_DAILY_DATA];
    }
    return HISTORICAL_DAILY_DATA.filter(d => {
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      return true;
    });
  }

  getDiurnalData(timeRange: '8h' | '24h' | '30d' = '24h'): DiurnalPoint[] {
    if (timeRange === '8h') {
      // Last 8 hours (14:00 to 22:00 slice from HOURLY_24H_DATA)
      const slice8h = HOURLY_24H_DATA.slice(7); // from 14:00 onward
      return slice8h.map(d => ({
        label: d.hour,
        waterVal: d.waterLiters,
        electricVal: Number((d.electricityKwh * 20).toFixed(1)),
        rawElectricityKwh: d.electricityKwh,
        rawWaterLiters: d.waterLiters,
        waterCostInr: d.waterCostInr,
        electricityCostInr: d.electricityCostInr,
      }));
    }

    if (timeRange === '30d') {
      // 10 3-day aggregation buckets representing the 30-day billing cycle
      const buckets30d = [
        { label: 'Day 1-3', water: 1020, power: 54.2 },
        { label: 'Day 4-6', water: 980, power: 52.8 },
        { label: 'Day 7-9', water: 1100, power: 58.0 },
        { label: 'Day 10-12', water: 940, power: 51.4 },
        { label: 'Day 13-15', water: 1050, power: 55.6 },
        { label: 'Day 16-18', water: 890, power: 49.2 },
        { label: 'Day 19-21', water: 1010, power: 53.0 },
        { label: 'Day 22-24', water: 970, power: 52.1 },
        { label: 'Day 25-27', water: 920, power: 57.5 },
        { label: 'Day 28-30', water: 960, power: 58.6 },
      ];

      return buckets30d.map(b => ({
        label: b.label,
        waterVal: b.water,
        electricVal: Number((b.power * 15).toFixed(1)), // scaled visually
        rawElectricityKwh: b.power,
        rawWaterLiters: b.water,
        waterCostInr: Number((b.water * 0.025).toFixed(2)),
        electricityCostInr: Number((b.power * 7.50).toFixed(2)),
      }));
    }

    // Default 24h: all 12 points
    return HOURLY_24H_DATA.map(d => ({
      label: d.hour,
      waterVal: d.waterLiters,
      electricVal: Number((d.electricityKwh * 20).toFixed(1)),
      rawElectricityKwh: d.electricityKwh,
      rawWaterLiters: d.waterLiters,
      waterCostInr: d.waterCostInr,
      electricityCostInr: d.electricityCostInr,
    }));
  }

  getTimeRangeMetrics(timeRange: '8h' | '24h' | '30d'): TimeRangeMetrics {
    const diurnal = this.getDiurnalData(timeRange);
    const totalWater = Math.round(diurnal.reduce((acc, p) => acc + p.rawWaterLiters, 0));
    const totalPower = Number(diurnal.reduce((acc, p) => acc + p.rawElectricityKwh, 0).toFixed(1));

    if (timeRange === '8h') {
      const slice8h = HOURLY_24H_DATA.slice(7);
      const baselineWater = slice8h.reduce((acc, p) => acc + p.baselineWater, 0);
      const baselinePower = slice8h.reduce((acc, p) => acc + p.baselineElectricity, 0);
      const waterSaved = baselineWater - totalWater;
      const energySaved = Number((baselinePower - totalPower).toFixed(1));
      return {
        totalWater,
        totalWaterUnit: 'Liters (Shift)',
        totalPower,
        totalPowerUnit: 'kWh (Shift)',
        waterSaved,
        energySaved,
        waterSavedCostInr: Number((waterSaved * 0.25).toFixed(2)),
        carbonAvoidedKg: Number((energySaved * 0.385).toFixed(1)),
        waterComparison: 'vs shift baseline (-14.5%)',
        powerComparison: 'vs shift baseline (-12.5%)',
      };
    }

    if (timeRange === '24h') {
      const baselineWater = HOURLY_24H_DATA.reduce((acc, p) => acc + p.baselineWater, 0);
      const baselinePower = HOURLY_24H_DATA.reduce((acc, p) => acc + p.baselineElectricity, 0);
      const waterSaved = baselineWater - totalWater;
      const energySaved = Number((baselinePower - totalPower).toFixed(1));
      return {
        totalWater,
        totalWaterUnit: 'Liters (Today)',
        totalPower,
        totalPowerUnit: 'kWh (Today)',
        waterSaved,
        energySaved,
        waterSavedCostInr: Number((waterSaved * 0.25).toFixed(2)),
        carbonAvoidedKg: Number((energySaved * 0.385).toFixed(1)),
        waterComparison: 'vs daily baseline (-15.8%)',
        powerComparison: 'vs daily baseline (-13.1%)',
      };
    }

    // 30d cycle aggregation
    const waterSaved = 1620;
    const energySaved = 51.2;
    return {
      totalWater,
      totalWaterUnit: 'Liters (Cycle)',
      totalPower,
      totalPowerUnit: 'kWh (Cycle)',
      waterSaved,
      energySaved,
      waterSavedCostInr: Number((waterSaved * 0.25).toFixed(2)),
      carbonAvoidedKg: Number((energySaved * 0.385).toFixed(1)),
      waterComparison: 'vs cycle baseline (-14.2%)',
      powerComparison: 'vs cycle baseline (-8.6%)',
    };
  }

  createSimulatedJitter(prevWater: WaterReading, prevPower: ElectricityReading) {
    const jitter = (Math.random() - 0.48) * 0.18;
    const newFlow = Math.max(0.2, Number((prevWater.flowRateLpm + jitter).toFixed(2)));
    const incrementLiters = Number(((newFlow / 60) * 3).toFixed(2));
    const newDaily = Number((prevWater.dailyTotalLiters + incrementLiters).toFixed(1));
    const newMonthly = Number((prevWater.monthlyTotalLiters + incrementLiters).toFixed(1));
    const pressureJitter = (Math.random() - 0.5) * 0.4;

    const nextWater: WaterReading = {
      ...prevWater,
      timestamp: 'Just now',
      flowRateLpm: newFlow,
      currentUsageLiters: Number((prevWater.currentUsageLiters + incrementLiters).toFixed(1)),
      currentUsageGallons: Number(((prevWater.currentUsageLiters + incrementLiters) * 0.264172).toFixed(1)),
      dailyTotalLiters: newDaily,
      monthlyTotalLiters: newMonthly,
      pressurePsi: Number((58.4 + pressureJitter).toFixed(1)),
    };

    const powerJitter = (Math.random() - 0.5) * 0.08;
    const basePower = prevPower.activePowerKw != null ? prevPower.activePowerKw : 1.42;
    const newPower = Math.max(0.4, Number((basePower + powerJitter).toFixed(2)));
    const kwhInc = Number(((newPower * 3) / 3600).toFixed(4));
    const voltageJitter = (Math.random() - 0.5) * 0.8;
    const baseDailyKwh = prevPower.dailyTotalKwh != null ? prevPower.dailyTotalKwh : 18.4;
    const baseMonthlyKwh = prevPower.monthlyTotalKwh != null ? prevPower.monthlyTotalKwh : 420.5;

    const nextPower: ElectricityReading = {
      ...prevPower,
      timestamp: 'Just now',
      activePowerKw: newPower,
      voltageVolts: Number((230.0 + voltageJitter).toFixed(1)),
      dailyTotalKwh: Number((baseDailyKwh + kwhInc).toFixed(2)),
      monthlyTotalKwh: Number((baseMonthlyKwh + kwhInc).toFixed(2)),
    };

    return { nextWater, nextPower };
  }
}

export const telemetryService: ITelemetryService = new MockTelemetryService();
