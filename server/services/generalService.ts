import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProfileRow, AlertRow } from '../../src/lib/supabase.js';
import { createScopedSupabaseClient } from './supabaseClient.js';
import { deviceService } from './deviceService.js';
import {
  AuthContext,
  AuthContextSchema,
  DeviceDto,
  ActiveAlertDto,
  SustainabilityReportDto,
  TimeRangePreset,
  DatabaseUnavailableError,
} from './types.js';
import { waterService } from './waterService.js';
import {
  evaluateSustainabilityScore,
  calculateCarbonAvoided,
  litersToGallons,
} from '../../src/utils/calculations.js';

export interface PlatformOverviewDto {
  userId: string;
  facility: {
    name: string;
    type: string;
    address: string | null;
    tier: string;
    sustainabilityScore: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
    list: DeviceDto[];
  };
  alerts: {
    totalUnresolved: number;
    criticalCount: number;
    warningCount: number;
  };
  sustainabilityIndex: {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    summary: string;
  };
  hardwareIntegrations: {
    waterFlowSensor: string;
    electricalSensor: string;
    displayUnit: string;
  };
}

export class GeneralService {
  /**
   * Retrieves high-level operational overview for the user's account and hardware estate.
   */
  async getPlatformOverview(
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<PlatformOverviewDto> {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);

    const devices = await deviceService.getDevices(context, customClient);
    const onlineCount = devices.filter(d => d.status === 'online').length;
    const offlineCount = devices.length - onlineCount;

    let facility: PlatformOverviewDto['facility'] = {
      name: 'AquaWatt Test Bench · Node Lab 01',
      type: 'Residential',
      address: 'Lab Bench #1 (ESP32 DevKit Telemetry Rig)',
      tier: 'Standard Pro',
      sustainabilityScore: 85,
    };

    let unresolvedAlerts: AlertRow[] = [];

    if (client) {
      try {
        // Fetch profile
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('id', context.userId)
          .maybeSingle();

        if (profileData) {
          const p = profileData as ProfileRow;
          facility = {
            name: p.facility_name,
            type: p.facility_type,
            address: p.address,
            tier: p.tier,
            sustainabilityScore: p.sustainability_score,
          };
        }

        // Fetch unresolved alerts for user's devices
        const deviceIds = devices.map(d => d.id);
        if (deviceIds.length > 0) {
          const { data: alertData } = await client
            .from('alerts')
            .select('*')
            .in('device_id', deviceIds)
            .eq('is_resolved', false);

          if (alertData) {
            unresolvedAlerts = alertData as AlertRow[];
          }
        }
      } catch (err) {
        console.warn('[GeneralService] Optional profile/alert lookup note:', err);
      }
    }

    const criticalCount = unresolvedAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = unresolvedAlerts.filter(a => a.severity === 'warning').length;

    // Calculate dynamic sustainability score
    const computedScore = evaluateSustainabilityScore(
      8, // baseline saving pct
      0, // power saving pct (0 due to INA219 unverified)
      unresolvedAlerts.length,
      2  // completed challenges
    );

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    if (computedScore >= 90) grade = 'A+';
    else if (computedScore >= 80) grade = 'A';
    else if (computedScore >= 70) grade = 'B';
    else if (computedScore >= 60) grade = 'C';
    else grade = 'D';

    return {
      userId: context.userId,
      facility,
      devices: {
        total: devices.length,
        online: onlineCount,
        offline: offlineCount,
        list: devices,
      },
      alerts: {
        totalUnresolved: unresolvedAlerts.length,
        criticalCount,
        warningCount,
      },
      sustainabilityIndex: {
        score: computedScore,
        grade,
        summary: `Facility rating is ${grade} (${computedScore}/100) with ${unresolvedAlerts.length} active alerts.`,
      },
      hardwareIntegrations: {
        waterFlowSensor: 'FS-S401 Turbine Pulse Sensor (Active & Operational)',
        electricalSensor: 'INA219 DC Monitor (Installed, Pending Calibration)',
        displayUnit: '16x2 Character LCD (Hardware Verified)',
      },
    };
  }

  /**
   * Retrieves active, unresolved alerts scoped to devices owned by the authenticated user.
   */
  async getActiveAlerts(
    context: AuthContext,
    options?: { deviceId?: string; severity?: 'critical' | 'warning' | 'info' | 'all' },
    customClient?: SupabaseClient<Database>
  ): Promise<ActiveAlertDto[]> {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }

    let targetDeviceIds: string[];

    if (options?.deviceId) {
      await deviceService.validateDeviceOwnership(options.deviceId, context, customClient);
      targetDeviceIds = [options.deviceId];
    } else {
      const devices = await deviceService.getDevices(context, customClient);
      targetDeviceIds = devices.map(d => d.id);
    }

    if (targetDeviceIds.length === 0) {
      return [];
    }

    try {
      let query = client
        .from('alerts')
        .select('*')
        .in('device_id', targetDeviceIds)
        .eq('is_resolved', false);

      if (options?.severity && options.severity !== 'all') {
        query = query.eq('severity', options.severity);
      }

      const { data, error } = await query.order('triggered_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to query active alerts: ${error.message}`);
      }

      if (!data) return [];

      return (data as AlertRow[]).map(row => ({
        id: row.id,
        deviceId: row.device_id,
        title: row.title,
        description: row.description,
        type: row.type,
        severity: row.severity,
        resource: row.resource,
        triggeredAt: row.triggered_at,
        isResolved: row.is_resolved,
        potentialCostImpactInr: row.potential_cost_impact != null ? Number(row.potential_cost_impact) : null,
        actionRequired: row.action_required,
      }));
    } catch (err) {
      console.warn('[GeneralService] Error retrieving active alerts:', err);
      return [];
    }
  }

  /**
   * Generates a comprehensive sustainability report using actual verified water telemetry
   * and transparently labeling uncalibrated electrical hardware and estimates.
   */
  async generateSustainabilityReport(
    context: AuthContext,
    options?: { deviceId?: string; timeRange?: TimeRangePreset },
    customClient?: SupabaseClient<Database>
  ): Promise<SustainabilityReportDto> {
    AuthContextSchema.parse(context);
    const timeRange: TimeRangePreset = options?.timeRange || '30d';

    const overview = await this.getPlatformOverview(context, customClient);
    const activeAlerts = await this.getActiveAlerts(context, { deviceId: options?.deviceId }, customClient);

    let totalLiters = 0;
    let waterCost = 0;

    const devices = options?.deviceId
      ? [await deviceService.getDeviceById(options.deviceId, context, customClient)]
      : overview.devices.list;

    for (const d of devices) {
      try {
        const waterSummary = await waterService.getWaterSummary(d.id, timeRange, context, customClient);
        const deviceVolume = waterSummary.aggregation.reduce((acc, b) => acc + b.totalLiters, 0);
        totalLiters += deviceVolume;
        waterCost += waterSummary.aggregation.reduce((acc, b) => acc + b.estimatedCostInr, 0);
      } catch (err) {
        console.warn(`[GeneralService] Telemetry rollup skipped for device ${d.id}:`, err);
      }
    }

    // Baseline conservation calculation (estimated 8% saved vs unmonitored baseline)
    const baselineEstimate = totalLiters > 0 ? totalLiters / 0.92 : 0;
    const waterSavedLiters = Number(Math.max(0, baselineEstimate - totalLiters).toFixed(1));
    const waterCarbonAvoided = calculateCarbonAvoided(waterSavedLiters, 0);

    return {
      userId: context.userId,
      generatedAt: new Date().toISOString(),
      timeRange,
      facilityName: overview.facility.name,
      waterMetrics: {
        totalLitersConsumed: Number(totalLiters.toFixed(1)),
        totalGallonsConsumed: litersToGallons(totalLiters),
        estimatedCostInr: Number(waterCost.toFixed(2)),
        waterSavedLiters,
        conservationVsBaselinePct: 8.0,
      },
      electricityMetrics: {
        isAvailable: false,
        hardwareStatus: 'uncalibrated_hardware',
        totalKwhConsumed: null,
        estimatedCostInr: null,
        statusNote: 'INA219 sensor is installed on physical ESP32 but pending calibration. Values are unrecorded to prevent simulated data.',
      },
      carbonMetrics: {
        totalCarbonAvoidedKg: waterCarbonAvoided,
        waterAvoidedKg: waterCarbonAvoided,
        electricityAvoidedKg: null,
        calculationBasis: 'Based on 0.00032 kg CO2 per liter water treated/delivered. Electricity avoided is null due to uncalibrated INA219.',
      },
      sustainabilityScore: overview.sustainabilityIndex.score,
      ratingGrade: overview.sustainabilityIndex.grade,
      activeAlertsSummary: `${activeAlerts.length} unresolved alerts (${activeAlerts.filter(a => a.severity === 'critical').length} critical).`,
      recommendations: [
        'Maintain continuous monitoring of FS-S401 turbine flow for early anomaly detection.',
        'Calibrate the INA219 current/voltage sensor to unlock electricity telemetry and dual-resource carbon analysis.',
        'Address active plumbing alerts promptly to maximize your facility sustainability score.',
      ],
    };
  }
}

export const generalService = new GeneralService();

