/**
 * Supabase Telemetry Service for AquaWatt (Phase 2 Physical Hardware Integration)
 * 
 * Interacts directly with the Supabase PostgreSQL database for real physical ESP32
 * telemetry. Keeps physical hardware data completely decoupled from mock data.
 * 
 * HARDWARE MAPPING:
 * - Microcontroller: ESP32
 * - Water Flow: FS-S401 turbine pulse flow sensor (Operational)
 * - Display: 16x2 Character LCD (Operational)
 * - Electrical: INA219 DC current/voltage sensor (Untested / In development)
 * 
 * CONSTRAINTS:
 * - Voltage, current and power fields are explicitly NULLABLE.
 * - Never returns fabricated numbers when physical mode is selected.
 * - When no records exist in Supabase, returns null or empty sets.
 */

import {
  WaterReading,
  ElectricityReading,
  SensorDevice,
  ConsumptionAlert,
  AIRecommendation,
  DailyComparisonPoint,
} from '../types';
import {
  ITelemetryService,
  TimeRangeMetrics,
  DiurnalPoint,
} from './telemetryService';
import { supabase, isSupabaseConfigured, SensorReadingRow, DeviceRow, AlertRow } from '../lib/supabase';

export class SupabaseTelemetryService implements ITelemetryService {
  /**
   * Synchronous fallback for water reading before first Supabase fetch completes
   */
  getInitialWaterReading(): WaterReading {
    return {
      timestamp: 'Awaiting Ingestion',
      flowRateLpm: 0.0,
      currentUsageGallons: 0.0,
      currentUsageLiters: 0.0,
      dailyTotalLiters: 0.0,
      monthlyTotalLiters: 0.0,
      pressurePsi: null,
      temperatureC: null,
      isPhysical: true,
      isSimulated: false,
      sensorModel: 'FS-S401',
    };
  }

  /**
   * Synchronous fallback for electricity reading before first Supabase fetch completes.
   * INA219 power fields are strictly null.
   */
  getInitialElectricityReading(): ElectricityReading {
    return {
      timestamp: 'Awaiting Ingestion',
      activePowerKw: null,
      voltageVolts: null,
      currentAmperes: null,
      frequencyHz: null,
      dailyTotalKwh: null,
      monthlyTotalKwh: null,
      powerFactor: null,
      isPhysical: true,
      isSimulated: false,
      statusNote: 'INA219 Sensor: Untested / In Development',
      sensorModel: 'INA219',
    };
  }

  getSensorNodes(): SensorDevice[] {
    // Synchronous default when physical mode starts
    return [];
  }

  getInitialAlerts(): ConsumptionAlert[] {
    return [];
  }

  getInitialRecommendations(): AIRecommendation[] {
    return [];
  }

  getWeeklyComparison(): DailyComparisonPoint[] {
    return [];
  }

  getHistoricalDaily(_startDate?: string, _endDate?: string): DailyComparisonPoint[] {
    return [];
  }

  getDiurnalData(_timeRange: '8h' | '24h' | '30d' = '24h'): DiurnalPoint[] {
    return [];
  }

  getTimeRangeMetrics(timeRange: '8h' | '24h' | '30d' = '24h', currentWater?: WaterReading): TimeRangeMetrics {
    // Map total water consumption using daily_total_liters and monthly_total_liters
    const totalWater = timeRange === '30d'
      ? (currentWater?.monthlyTotalLiters ?? 0)
      : (currentWater?.dailyTotalLiters ?? 0);

    return {
      totalWater,
      totalWaterUnit: 'Liters',
      totalPower: null,
      totalPowerUnit: 'kWh (INA219 Untested)',
      waterSaved: 0,
      energySaved: null,
      waterSavedCostInr: 0,
      carbonAvoidedKg: null,
      waterComparison: 'Physical Telemetry (FS-S401)',
      powerComparison: 'INA219 Untested',
    };
  }

  /**
   * Under physical hardware mode, simulated jitter is forbidden.
   * Readings remain unaltered until a real physical database row arrives.
   */
  createSimulatedJitter(prevWater: WaterReading, prevPower: ElectricityReading) {
    return {
      nextWater: { ...prevWater, isSimulated: false, isPhysical: true },
      nextPower: { ...prevPower, isSimulated: false, isPhysical: true },
    };
  }

  // ---------------------------------------------------------------------------
  // ASYNC PHYSICAL DATABASE QUERY METHODS
  // ---------------------------------------------------------------------------

  /**
   * Fetches the latest recorded sensor reading row from Supabase.
   * Maps all 19 columns from public.sensor_readings.
   */
  async fetchLatestReading(deviceId?: string): Promise<{
    water: WaterReading | null;
    electricity: ElectricityReading | null;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { water: null, electricity: null };
    }

    try {
      let query = supabase
        .from('sensor_readings')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AquaWatt Supabase] Error fetching latest sensor reading:', error.message);
        return { water: null, electricity: null };
      }

      if (!data || data.length === 0) {
        return { water: null, electricity: null };
      }

      const row: SensorReadingRow = data[0];
      const recordedDate = new Date(row.recorded_at);
      const timeStr = isNaN(recordedDate.getTime())
        ? 'Just now'
        : recordedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Water telemetry (FS-S401 Turbine Flow Sensor)
      const water: WaterReading = {
        timestamp: timeStr,
        recordedAt: row.recorded_at,
        deviceId: row.device_id,
        flowRateLpm: Number(row.flow_rate_lpm ?? 0),
        currentUsageLiters: Number(row.current_liters ?? 0),
        currentUsageGallons: Number(((Number(row.current_liters ?? 0)) * 0.264172).toFixed(1)),
        dailyTotalLiters: Number(row.daily_total_liters ?? 0),
        monthlyTotalLiters: Number(row.monthly_total_liters ?? 0),
        pressurePsi: row.line_pressure_psi != null ? Number(row.line_pressure_psi) : null,
        temperatureC: row.water_temp_c != null ? Number(row.water_temp_c) : null,
        pulseCount: row.pulse_count != null ? Number(row.pulse_count) : null,
        isPhysical: true,
        isSimulated: false,
        sensorModel: 'FS-S401',
      };

      // Electrical telemetry (INA219 DC Monitor - strictly preserves null values until tested)
      const electricity: ElectricityReading = {
        timestamp: timeStr,
        recordedAt: row.recorded_at,
        deviceId: row.device_id,
        activePowerKw: row.active_power_kw != null ? Number(row.active_power_kw) : null,
        powerW: row.power_w != null ? Number(row.power_w) : null,
        voltageVolts: row.voltage_v != null ? Number(row.voltage_v) : null,
        currentAmperes: row.current_a != null ? Number(row.current_a) : null,
        frequencyHz: null,
        dailyTotalKwh: row.daily_total_kwh != null ? Number(row.daily_total_kwh) : null,
        monthlyTotalKwh: row.monthly_total_kwh != null ? Number(row.monthly_total_kwh) : null,
        powerFactor: row.power_factor != null ? Number(row.power_factor) : null,
        sensorNotes: row.sensor_notes,
        isPhysical: true,
        isSimulated: false,
        statusNote: row.sensor_notes || 'INA219 Sensor: Untested / In Development',
        sensorModel: 'INA219',
      };

      return { water, electricity };
    } catch (err) {
      console.error('[AquaWatt Supabase] Unexpected error fetching sensor reading:', err);
      return { water: null, electricity: null };
    }
  }

  /**
   * Fetches real registered ESP32 devices from Supabase
   */
  async fetchDevices(): Promise<SensorDevice[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[AquaWatt Supabase] Error fetching devices:', error.message);
        return [];
      }

      if (!data) return [];

      return (data as DeviceRow[]).map(row => ({
        id: row.device_eui || row.id,
        name: row.name,
        type: row.device_type,
        location: row.location,
        status: row.status,
        batteryPercent: row.battery_percent != null ? Number(row.battery_percent) : 100,
        signalStrengthDbm: row.signal_strength_dbm != null ? Number(row.signal_strength_dbm) : -65,
        firmwareVersion: row.firmware_version,
        lastSync: row.last_sync ? new Date(row.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never',
        isSimulated: false,
        deviceEui: row.device_eui,
        waterSensorType: (row.water_sensor_type as any) || 'FS-S401',
        powerSensorType: (row.power_sensor_type as any) || 'INA219',
        displayType: (row.display_type as any) || '16x2_LCD',
      }));
    } catch (err) {
      console.error('[AquaWatt Supabase] Unexpected error fetching devices:', err);
      return [];
    }
  }

  /**
   * Fetches real alerts from Supabase
   */
  async fetchAlerts(): Promise<ConsumptionAlert[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('[AquaWatt Supabase] Error fetching alerts:', error.message);
        return [];
      }

      if (!data) return [];

      return (data as AlertRow[]).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        severity: row.severity,
        resource: row.resource === 'both' ? 'water' : row.resource,
        timestamp: new Date(row.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: 'Physical Node',
        estimatedWastage: row.estimated_wastage || undefined,
        potentialCostImpact: row.potential_cost_impact != null ? Number(row.potential_cost_impact) : undefined,
        isRead: row.is_read,
        isResolved: row.is_resolved,
        actionRequired: row.action_required || undefined,
      }));
    } catch (err) {
      console.error('[AquaWatt Supabase] Unexpected error fetching alerts:', err);
      return [];
    }
  }

  /**
   * Fetches historical timeseries readings from Supabase
   */
  async fetchHistoricalReadings(
    timeRange: '8h' | '24h' | '30d' = '24h'
  ): Promise<DiurnalPoint[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const now = new Date();
      let hoursBack = 24;
      if (timeRange === '8h') hoursBack = 8;
      if (timeRange === '30d') hoursBack = 24 * 30;

      const sinceDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .gte('recorded_at', sinceDate)
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('[AquaWatt Supabase] Error fetching timeseries readings:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return (data as SensorReadingRow[]).map(row => {
        const date = new Date(row.recorded_at);
        const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const waterLiters = Number(row.current_liters ?? row.flow_rate_lpm ?? 0);
        const powerKwh = row.active_power_kw != null ? Number(row.active_power_kw) : 0;

        return {
          label: timeLabel,
          waterVal: waterLiters,
          electricVal: row.active_power_kw != null ? Number((powerKwh * 20).toFixed(1)) : 0,
          rawElectricityKwh: powerKwh,
          rawWaterLiters: waterLiters,
          waterCostInr: Number((waterLiters * 0.025).toFixed(2)),
          electricityCostInr: row.active_power_kw != null ? Number((powerKwh * 7.50).toFixed(2)) : 0,
        };
      });
    } catch (err) {
      console.error('[AquaWatt Supabase] Unexpected error fetching timeseries:', err);
      return [];
    }
  }

  /**
   * Subscribes to real-time physical telemetry updates pushed to Supabase by the ESP32.
   * Returns an unsubscribe cleanup callback.
   */
  subscribeToTelemetry(
    onNewReading: (data: { water: WaterReading | null; electricity: ElectricityReading | null }) => void
  ): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel('physical-sensor-stream')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_readings',
          },
          payload => {
            const row = payload.new as SensorReadingRow;
            const recordedDate = new Date(row.recorded_at);
            const timeStr = isNaN(recordedDate.getTime())
              ? 'Just now'
              : recordedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const water: WaterReading = {
              timestamp: timeStr,
              recordedAt: row.recorded_at,
              deviceId: row.device_id,
              flowRateLpm: Number(row.flow_rate_lpm ?? 0),
              currentUsageLiters: Number(row.current_liters ?? 0),
              currentUsageGallons: Number(((Number(row.current_liters ?? 0)) * 0.264172).toFixed(1)),
              dailyTotalLiters: Number(row.daily_total_liters ?? 0),
              monthlyTotalLiters: Number(row.monthly_total_liters ?? 0),
              pressurePsi: row.line_pressure_psi != null ? Number(row.line_pressure_psi) : null,
              temperatureC: row.water_temp_c != null ? Number(row.water_temp_c) : null,
              pulseCount: row.pulse_count != null ? Number(row.pulse_count) : null,
              isPhysical: true,
              isSimulated: false,
              sensorModel: 'FS-S401',
            };

            const electricity: ElectricityReading = {
              timestamp: timeStr,
              recordedAt: row.recorded_at,
              deviceId: row.device_id,
              activePowerKw: row.active_power_kw != null ? Number(row.active_power_kw) : null,
              powerW: row.power_w != null ? Number(row.power_w) : null,
              voltageVolts: row.voltage_v != null ? Number(row.voltage_v) : null,
              currentAmperes: row.current_a != null ? Number(row.current_a) : null,
              frequencyHz: null,
              dailyTotalKwh: row.daily_total_kwh != null ? Number(row.daily_total_kwh) : null,
              monthlyTotalKwh: row.monthly_total_kwh != null ? Number(row.monthly_total_kwh) : null,
              powerFactor: row.power_factor != null ? Number(row.power_factor) : null,
              sensorNotes: row.sensor_notes,
              isPhysical: true,
              isSimulated: false,
              statusNote: row.sensor_notes || 'INA219 Sensor: Untested / In Development',
              sensorModel: 'INA219',
            };

            onNewReading({ water, electricity });
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    } catch (err) {
      console.error('[AquaWatt Supabase] Failed to subscribe to real-time telemetry:', err);
      return () => {};
    }
  }
}

export const supabaseTelemetryService = new SupabaseTelemetryService();
