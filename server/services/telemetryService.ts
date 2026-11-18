import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SensorReadingRow } from '../../src/lib/supabase.js';
import { createScopedSupabaseClient } from './supabaseClient.js';
import { deviceService } from './deviceService.js';
import {
  AuthContext,
  DateRange,
  DateRangeSchema,
  WaterMetricsDto,
  ElectricityMetricsDto,
  TelemetrySnapshotDto,
  DatabaseUnavailableError,
} from './types.js';
import {
  litersToGallons,
  calculateResourceCost,
  DEFAULT_INR_WATER_RATE,
  DEFAULT_INR_ELECTRICITY_RATE,
} from '../../src/utils/calculations.js';

export class TelemetryService {
  /**
   * Transforms a database SensorReadingRow into WaterMetricsDto
   */
  public mapWaterReading(deviceId: string, row?: SensorReadingRow | null): WaterMetricsDto {
    if (!row) {
      return {
        deviceId,
        timestamp: 'No Data',
        recordedAt: null,
        flowRateLpm: 0,
        currentUsageLiters: 0,
        currentUsageGallons: 0,
        dailyTotalLiters: 0,
        monthlyTotalLiters: 0,
        pulseCount: null,
        pressurePsi: null,
        temperatureC: null,
        pressureStatusNote: 'Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.',
        temperatureStatusNote: 'Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig.',
        estimatedDailyCostInr: 0,
        estimatedMonthlyCostInr: 0,
        sensorModel: 'FS-S401',
        status: 'no_data',
      };
    }

    const flowRate = Number(row.flow_rate_lpm ?? 0);
    const currentLiters = Number(row.current_liters ?? 0);
    const dailyTotalLiters = Number(row.daily_total_liters ?? 0);
    const monthlyTotalLiters = Number(row.monthly_total_liters ?? 0);

    // Hardware constraints: FS-S401 is purely a turbine pulse flow meter.
    // Pressure and temperature sensors are unverified and unconfirmed in current physical rig.
    // Both remain null with explicit status notes.
    const pressureStatusNote = 'Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.';
    const temperatureStatusNote = 'Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig.';

    return {
      deviceId,
      timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedAt: row.recorded_at,
      flowRateLpm: flowRate,
      currentUsageLiters: currentLiters,
      currentUsageGallons: litersToGallons(currentLiters),
      dailyTotalLiters,
      monthlyTotalLiters,
      pulseCount: row.pulse_count != null ? Number(row.pulse_count) : null,
      pressurePsi: null,
      temperatureC: null,
      pressureStatusNote,
      temperatureStatusNote,
      estimatedDailyCostInr: calculateResourceCost(dailyTotalLiters, DEFAULT_INR_WATER_RATE),
      estimatedMonthlyCostInr: calculateResourceCost(monthlyTotalLiters, DEFAULT_INR_WATER_RATE),
      sensorModel: 'FS-S401',
      status: flowRate > 0 ? 'active' : 'zero_flow',
    };
  }

  /**
   * Transforms a database SensorReadingRow into ElectricityMetricsDto
   * Strictly respects hardware constraints:
   * If INA219 fields are null, isAvailable is false, metrics remain null,
   * and no fabricated values are ever generated.
   */
  public mapElectricityReading(deviceId: string, row?: SensorReadingRow | null): ElectricityMetricsDto {
    if (!row) {
      return {
        deviceId,
        timestamp: 'No Data',
        recordedAt: null,
        isAvailable: false,
        hardwareStatus: 'sensor_missing',
        statusNote: 'No electrical telemetry available for this device.',
        sensorModel: 'INA219',
        voltageV: null,
        currentA: null,
        powerW: null,
        activePowerKw: null,
        dailyTotalKwh: null,
        monthlyTotalKwh: null,
        powerFactor: null,
        estimatedDailyCostInr: null,
        estimatedMonthlyCostInr: null,
      };
    }

    // Check if INA219 measurements are present
    const hasMeasurements =
      row.active_power_kw != null ||
      row.power_w != null ||
      row.voltage_v != null ||
      row.daily_total_kwh != null;

    if (!hasMeasurements) {
      return {
        deviceId,
        timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recordedAt: row.recorded_at,
        isAvailable: false,
        hardwareStatus: 'uncalibrated_hardware',
        statusNote: row.sensor_notes || 'INA219 DC sensor installed on ESP32 but pending electrical calibration.',
        sensorModel: 'INA219',
        voltageV: null,
        currentA: null,
        powerW: null,
        activePowerKw: null,
        dailyTotalKwh: null,
        monthlyTotalKwh: null,
        powerFactor: null,
        estimatedDailyCostInr: null,
        estimatedMonthlyCostInr: null,
      };
    }

    const dailyKwh = row.daily_total_kwh != null ? Number(row.daily_total_kwh) : null;
    const monthlyKwh = row.monthly_total_kwh != null ? Number(row.monthly_total_kwh) : null;

    return {
      deviceId,
      timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedAt: row.recorded_at,
      isAvailable: true,
      hardwareStatus: 'operational',
      statusNote: row.sensor_notes || 'INA219 Active and Measured',
      sensorModel: 'INA219',
      voltageV: row.voltage_v != null ? Number(row.voltage_v) : null,
      currentA: row.current_a != null ? Number(row.current_a) : null,
      powerW: row.power_w != null ? Number(row.power_w) : null,
      activePowerKw: row.active_power_kw != null ? Number(row.active_power_kw) : null,
      dailyTotalKwh: dailyKwh,
      monthlyTotalKwh: monthlyKwh,
      powerFactor: row.power_factor != null ? Number(row.power_factor) : null,
      estimatedDailyCostInr: dailyKwh != null ? calculateResourceCost(dailyKwh, DEFAULT_INR_ELECTRICITY_RATE) : null,
      estimatedMonthlyCostInr: monthlyKwh != null ? calculateResourceCost(monthlyKwh, DEFAULT_INR_ELECTRICITY_RATE) : null,
    };
  }

  /**
   * Retrieves latest reading for a user-owned device.
   */
  async getLatestReading(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<TelemetrySnapshotDto> {
    const device = await deviceService.validateDeviceOwnership(deviceId, context, customClient);
    const client = createScopedSupabaseClient(context, customClient);

    if (!client) {
      throw new DatabaseUnavailableError();
    }

    const { data, error } = await client
      .from('sensor_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error querying latest sensor reading: ${error.message}`);
    }

    const row = data as SensorReadingRow | null;
    const water = this.mapWaterReading(deviceId, row);
    const electricity = this.mapElectricityReading(deviceId, row);

    return {
      deviceId,
      device,
      water,
      electricity,
      recordedAt: row?.recorded_at || null,
    };
  }

  /**
   * Retrieves historical raw sensor readings within an explicit ISO date range.
   */
  async getHistoricalReadings(
    deviceId: string,
    dateRange: DateRange,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<SensorReadingRow[]> {
    DateRangeSchema.parse(dateRange);
    await deviceService.validateDeviceOwnership(deviceId, context, customClient);

    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }

    const { data, error } = await client
      .from('sensor_readings')
      .select('*')
      .eq('device_id', deviceId)
      .gte('recorded_at', dateRange.startDate)
      .lte('recorded_at', dateRange.endDate)
      .order('recorded_at', { ascending: true });

    if (error) {
      throw new Error(`Database error querying historical telemetry: ${error.message}`);
    }

    return (data || []) as SensorReadingRow[];
  }
}

export const telemetryService = new TelemetryService();
