import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DeviceRow } from '../../src/lib/supabase.js';
import { createScopedSupabaseClient } from './supabaseClient.js';
import {
  AuthContext,
  AuthContextSchema,
  DeviceDto,
  UnauthorizedDeviceAccessError,
  DatabaseUnavailableError,
} from './types.js';

export class DeviceService {
  /**
   * Maps a database DeviceRow to a clean DeviceDto
   */
  public mapRowToDto(row: DeviceRow): DeviceDto {
    return {
      id: row.id,
      userId: row.user_id,
      deviceEui: row.device_eui,
      name: row.name,
      deviceType: row.device_type,
      location: row.location,
      status: row.status,
      waterSensorType: row.water_sensor_type || 'FS-S401',
      powerSensorType: row.power_sensor_type || 'INA219',
      displayType: row.display_type || '16x2_LCD',
      batteryPercent: row.battery_percent != null ? Number(row.battery_percent) : null,
      signalStrengthDbm: row.signal_strength_dbm != null ? Number(row.signal_strength_dbm) : null,
      firmwareVersion: row.firmware_version,
      lastSync: row.last_sync,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Validates that the device exists and belongs to the authenticated user.
   * Throws UnauthorizedDeviceAccessError if ownership check fails.
   */
  async validateDeviceOwnership(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<DeviceDto> {
    AuthContextSchema.parse(context);

    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      throw new DatabaseUnavailableError();
    }

    const { data, error } = await client
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error while verifying device ownership: ${error.message}`);
    }

    if (!data) {
      throw new UnauthorizedDeviceAccessError(deviceId, context.userId);
    }

    const row = data as DeviceRow;
    // Explicit cross-user verification even if RLS is bypassed (e.g. service role)
    if (row.user_id !== context.userId) {
      throw new UnauthorizedDeviceAccessError(deviceId, context.userId);
    }

    return this.mapRowToDto(row);
  }

  /**
   * Retrieves all devices owned by the authenticated user.
   */
  async getDevices(
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<DeviceDto[]> {
    AuthContextSchema.parse(context);

    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }

    const { data, error } = await client
      .from('devices')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to query user devices: ${error.message}`);
    }

    if (!data) return [];

    return (data as DeviceRow[]).map(row => this.mapRowToDto(row));
  }

  /**
   * Retrieves a single device by ID with ownership verification.
   */
  async getDeviceById(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<DeviceDto> {
    return this.validateDeviceOwnership(deviceId, context, customClient);
  }

  /**
   * Retrieves device operational health and hardware telemetry status.
   */
  async getDeviceStatus(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<{
    device: DeviceDto;
    isOnline: boolean;
    waterHardwareStatus: string;
    powerHardwareStatus: string;
    lastSeen: string | null;
  }> {
    const device = await this.validateDeviceOwnership(deviceId, context, customClient);
    const isOnline = device.status === 'online';

    return {
      device,
      isOnline,
      waterHardwareStatus: `${device.waterSensorType} Turbine Flow Sensor (Operational)`,
      powerHardwareStatus: `${device.powerSensorType} DC Sensor (Installed, Pending Calibration)`,
      lastSeen: device.lastSync,
    };
  }
}

export const deviceService = new DeviceService();
