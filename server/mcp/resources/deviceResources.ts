import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getVerifiedContext } from '../tools/toolHelper.js';
import { deviceService } from '../../services/deviceService.js';
import { telemetryService } from '../../services/telemetryService.js';
import { waterService } from '../../services/waterService.js';
import { electricityService } from '../../services/electricityService.js';
import { generalService } from '../../services/generalService.js';
import { DomainServiceError, UnauthorizedDeviceAccessError } from '../../services/types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAndExtractDeviceId(variables: Record<string, string | string[]>): string {
  const raw = variables.deviceId;
  const deviceId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!deviceId || !UUID_REGEX.test(deviceId)) {
    throw new McpError(ErrorCode.InvalidParams, `Invalid deviceId parameter: '${deviceId}' is not a valid UUID.`);
  }
  return deviceId;
}

export function registerDeviceResources(server: McpServer): void {
  // =========================================================================
  // RESOURCE 1: aquawatt://devices (Static Resource)
  // List devices owned by the authenticated user including device names,
  // types, connectivity status and verified hardware availability.
  // =========================================================================
  server.registerResource(
    'user-devices',
    'aquawatt://devices',
    {
      title: 'User Registered IoT Devices',
      description: 'List devices owned by the authenticated user including device names, types, connectivity status and verified hardware availability.',
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const devices = await deviceService.getDevices(context);

        const structuredList = devices.map(d => ({
          id: d.id,
          userId: d.userId,
          deviceEui: d.deviceEui,
          name: d.name,
          deviceType: d.deviceType,
          location: d.location,
          status: d.status,
          batteryPercent: d.batteryPercent,
          signalStrengthDbm: d.signalStrengthDbm,
          firmwareVersion: d.firmwareVersion,
          lastSync: d.lastSync,
          hardwareAvailability: {
            waterSensor: 'FS-S401 (Turbine Hall-Effect · Verified physical)',
            electricalSensor: 'INA219 (DC Voltage/Current · Calibration pending)',
            display: '16x2 LCD (Hardware mounted)',
            pressureSensor: 'Unverified (Null in physical mode)',
            temperatureSensor: 'Unverified (Null in physical mode)',
          },
        }));

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  totalDevices: structuredList.length,
                  devices: structuredList,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // RESOURCE 2: aquawatt://devices/{deviceId}/status (Resource Template)
  // Return operational status and last synchronization information.
  // =========================================================================
  server.registerResource(
    'device-status',
    new ResourceTemplate('aquawatt://devices/{deviceId}/status', {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map(d => ({
              uri: `aquawatt://devices/${d.id}/status`,
              name: `status-${d.name}`,
              description: `Operational status and sync state for ${d.name}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'Device Operational Status',
      description: 'Return operational status, hardware availability and last synchronization information for an AquaWatt IoT device.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      try {
        const deviceId = validateAndExtractDeviceId(variables);
        const context = getVerifiedContext(extra);
        const status = await deviceService.getDeviceStatus(deviceId, context);

        const payload = {
          deviceId: status.device.id,
          deviceName: status.device.name,
          status: status.device.status,
          isOnline: status.isOnline,
          lastSeen: status.lastSeen,
          hardwareStatus: {
            waterSensor: status.waterHardwareStatus,
            powerSensor: status.powerHardwareStatus,
          },
          device: status.device,
        };

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(payload, null, 2),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // RESOURCE 3: aquawatt://devices/{deviceId}/latest-readings (Resource Template)
  // Return the latest verified water and electricity readings.
  // Preserve null values for unverified sensors.
  // =========================================================================
  server.registerResource(
    'device-latest-readings',
    new ResourceTemplate('aquawatt://devices/{deviceId}/latest-readings', {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map(d => ({
              uri: `aquawatt://devices/${d.id}/latest-readings`,
              name: `latest-readings-${d.name}`,
              description: `Latest verified sensor readings for ${d.name}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'Device Latest Telemetry Readings',
      description: 'Return the latest verified water and electricity readings for an AquaWatt IoT device, preserving null values for unverified sensors.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      try {
        const deviceId = validateAndExtractDeviceId(variables);
        const context = getVerifiedContext(extra);
        const snapshot = await telemetryService.getLatestReading(deviceId, context);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(snapshot, null, 2),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // RESOURCE 4: aquawatt://devices/{deviceId}/water-summary (Resource Template)
  // Return water consumption summaries and available historical metrics.
  // =========================================================================
  server.registerResource(
    'device-water-summary',
    new ResourceTemplate('aquawatt://devices/{deviceId}/water-summary', {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map(d => ({
              uri: `aquawatt://devices/${d.id}/water-summary`,
              name: `water-summary-${d.name}`,
              description: `Water consumption summary for ${d.name}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'Device Water Consumption Summary',
      description: 'Return water consumption summaries and available historical metrics from verified FS-S401 turbine flow sensors.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      try {
        const deviceId = validateAndExtractDeviceId(variables);
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(deviceId, context);
        const metrics = await waterService.getWaterMetrics(deviceId, context);

        const summary = {
          deviceId: device.id,
          deviceName: device.name,
          location: device.location,
          sensorModel: 'FS-S401 Turbine Flow Meter',
          status: device.status,
          telemetry: {
            flowRateLpm: metrics.flowRateLpm,
            todayUsageLiters: metrics.dailyTotalLiters,
            todayUsageGallons: metrics.currentUsageGallons,
            monthlyTotalLiters: metrics.monthlyTotalLiters,
            estimatedDailyCostInr: metrics.estimatedDailyCostInr,
            estimatedMonthlyCostInr: metrics.estimatedMonthlyCostInr,
            lastRecordedAt: metrics.recordedAt,
          },
          hardwareIntegrity: {
            pulseFlowSensor: 'Verified physical telemetry from FS-S401 turbine.',
            pressureSensor: metrics.pressureStatusNote,
            temperatureSensor: metrics.temperatureStatusNote,
          },
        };

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // RESOURCE 5: aquawatt://devices/{deviceId}/electricity-summary (Resource Template)
  // Return verified electricity metrics or an explicit unavailable status when INA219 calibration is pending.
  // =========================================================================
  server.registerResource(
    'device-electricity-summary',
    new ResourceTemplate('aquawatt://devices/{deviceId}/electricity-summary', {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map(d => ({
              uri: `aquawatt://devices/${d.id}/electricity-summary`,
              name: `electricity-summary-${d.name}`,
              description: `Electricity monitoring status for ${d.name}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'Device Electricity Metrics Summary',
      description: 'Return verified electricity metrics or an explicit unavailable status when INA219 calibration is pending.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      try {
        const deviceId = validateAndExtractDeviceId(variables);
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(deviceId, context);
        const metrics = await electricityService.getElectricityMetrics(deviceId, context);

        const summary = {
          deviceId: device.id,
          deviceName: device.name,
          location: device.location,
          sensorModel: 'INA219 High-Side DC Current & Voltage Sensor',
          isAvailable: metrics.isAvailable,
          hardwareStatus: 'INA219_PENDING_CALIBRATION',
          metrics: {
            voltageV: metrics.voltageV,
            currentA: metrics.currentA,
            powerW: metrics.powerW,
            activePowerKw: metrics.activePowerKw,
            dailyTotalKwh: metrics.dailyTotalKwh,
            monthlyTotalKwh: metrics.monthlyTotalKwh,
            powerFactor: metrics.powerFactor,
          },
          statusNote: metrics.statusNote,
          calibrationNotice: 'INA219 DC power telemetry is awaiting bench calibration against calibrated multimeter and shunt resistor verification. Simulated electrical values are strictly prohibited in physical mode.',
        };

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // RESOURCE 6: aquawatt://devices/{deviceId}/alerts (Resource Template)
  // Return alerts belonging to the authenticated user's device.
  // =========================================================================
  server.registerResource(
    'device-alerts',
    new ResourceTemplate('aquawatt://devices/{deviceId}/alerts', {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map(d => ({
              uri: `aquawatt://devices/${d.id}/alerts`,
              name: `alerts-${d.name}`,
              description: `Active alerts for ${d.name}`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: 'Device Active Alerts',
      description: 'Return active telemetry alerts and threshold warnings belonging to the authenticated user device.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      try {
        const deviceId = validateAndExtractDeviceId(variables);
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(deviceId, context);
        const alerts = await generalService.getActiveAlerts(context, { deviceId });

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  deviceId: device.id,
                  deviceName: device.name,
                  totalActiveAlerts: alerts.length,
                  alerts,
                  retrievedAt: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
}
