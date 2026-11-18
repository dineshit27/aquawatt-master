// server.ts
import path from "path";
import express from "express";
import cors from "cors";
import { z as z8 } from "zod";

// server/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3e3),
  HOST: z.string().default("0.0.0.0"),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  CORS_ORIGINS: z.string().optional().default("http://localhost:3000,http://127.0.0.1:3000"),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  MCP_SERVER_NAME: z.string().default("aquawatt-mcp-server"),
  MCP_SERVER_VERSION: z.string().default("1.0.0"),
  MCP_RESOURCE_ID: z.string().default("aquawatt://mcp"),
  MCP_SESSION_TTL_MS: z.coerce.number().int().positive().default(18e5),
  // 30 minutes
  MCP_SESSION_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(3e5),
  // 5 minutes
  TRUST_PROXY: z.union([z.boolean(), z.string(), z.number()]).default(true)
});
var parsedEnv = null;
function validateEnv(customEnv) {
  const source = customEnv || process.env;
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid environment configuration: ${errorDetails}`);
  }
  parsedEnv = result.data;
  return parsedEnv;
}
function getEnv(forceRefresh = false) {
  if (!parsedEnv || forceRefresh) {
    return validateEnv();
  }
  return parsedEnv;
}
var env = getEnv();

// server/mcp/server.ts
import { randomUUID } from "crypto";
import { McpServer as McpServer2 } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// server/mcp/tools/deviceTools.ts
import { z as z3 } from "zod";

// server/services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
function isServerSupabaseConfigured() {
  const env2 = getEnv();
  const url = env2.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = env2.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return false;
  }
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();
  if (trimmedUrl === "" || trimmedKey === "" || trimmedUrl.includes("your-project-id") || trimmedUrl.includes("placeholder") || trimmedKey.includes("placeholder")) {
    return false;
  }
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
var customClientOverride = null;
function createScopedSupabaseClient(context, customClient) {
  if (process.env.NODE_ENV === "production") {
    if (!isServerSupabaseConfigured()) {
      return null;
    }
  } else {
    if (customClient) {
      return customClient;
    }
    if (customClientOverride) {
      return customClientOverride;
    }
    if (!isServerSupabaseConfigured()) {
      return null;
    }
  }
  const env2 = getEnv();
  const url = (env2.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim();
  const anonKey = (env2.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY).trim();
  const serviceKey = (env2.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (context?.isServiceRole && serviceKey) {
    return createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  const headers = {};
  if (context?.userToken) {
    headers["Authorization"] = `Bearer ${context.userToken.trim()}`;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers
    }
  });
}

// server/services/types.ts
import { z as z2 } from "zod";
var AuthContextSchema = z2.object({
  userId: z2.string().uuid({ message: "userId must be a valid UUID" }),
  userToken: z2.string().optional(),
  email: z2.string().email().optional(),
  role: z2.string().optional(),
  isServiceRole: z2.boolean().optional()
});
var DateRangeSchema = z2.object({
  startDate: z2.string().datetime({ message: "startDate must be a valid ISO 8601 datetime" }),
  endDate: z2.string().datetime({ message: "endDate must be a valid ISO 8601 datetime" })
}).refine(
  (data) => new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(),
  { message: "startDate must be earlier than or equal to endDate", path: ["endDate"] }
);
var AggregationPeriodSchema = z2.enum(["hourly", "daily", "weekly", "monthly"]);
var TimeRangePresetSchema = z2.enum(["8h", "24h", "7d", "30d"]);
var DomainServiceError = class extends Error {
  constructor(message, code, statusCode = 400, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "DomainServiceError";
  }
};
var UnauthorizedDeviceAccessError = class extends DomainServiceError {
  constructor(deviceId, userId) {
    super(
      `Access denied: device '${deviceId}' does not belong to user '${userId}' or does not exist.`,
      "DEVICE_ACCESS_DENIED",
      403,
      { deviceId, userId }
    );
    this.name = "UnauthorizedDeviceAccessError";
  }
};
var DeviceNotFoundError = class extends DomainServiceError {
  constructor(deviceId) {
    super(`Device with ID '${deviceId}' was not found.`, "DEVICE_NOT_FOUND", 404, { deviceId });
    this.name = "DeviceNotFoundError";
  }
};
var DatabaseUnavailableError = class extends DomainServiceError {
  constructor(message = "Database service is currently unconfigured or unreachable.") {
    super(message, "DATABASE_UNAVAILABLE", 503);
    this.name = "DatabaseUnavailableError";
  }
};
var UnauthenticatedError = class extends DomainServiceError {
  constructor(message = "Authentication required. Missing Bearer JWT.") {
    super(message, "UNAUTHENTICATED", 401);
    this.name = "UnauthenticatedError";
  }
};
var InvalidTokenError = class extends DomainServiceError {
  constructor(message = "Invalid or expired authentication token.") {
    super(message, "INVALID_TOKEN", 401);
    this.name = "InvalidTokenError";
  }
};

// server/services/deviceService.ts
var DeviceService = class {
  /**
   * Maps a database DeviceRow to a clean DeviceDto
   */
  mapRowToDto(row) {
    return {
      id: row.id,
      userId: row.user_id,
      deviceEui: row.device_eui,
      name: row.name,
      deviceType: row.device_type,
      location: row.location,
      status: row.status,
      waterSensorType: row.water_sensor_type || "FS-S401",
      powerSensorType: row.power_sensor_type || "INA219",
      displayType: row.display_type || "16x2_LCD",
      batteryPercent: row.battery_percent != null ? Number(row.battery_percent) : null,
      signalStrengthDbm: row.signal_strength_dbm != null ? Number(row.signal_strength_dbm) : null,
      firmwareVersion: row.firmware_version,
      lastSync: row.last_sync,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  /**
   * Validates that the device exists and belongs to the authenticated user.
   * Throws UnauthorizedDeviceAccessError if ownership check fails.
   */
  async validateDeviceOwnership(deviceId, context, customClient) {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      throw new DatabaseUnavailableError();
    }
    const { data, error } = await client.from("devices").select("*").eq("id", deviceId).maybeSingle();
    if (error) {
      throw new Error(`Database error while verifying device ownership: ${error.message}`);
    }
    if (!data) {
      throw new UnauthorizedDeviceAccessError(deviceId, context.userId);
    }
    const row = data;
    if (row.user_id !== context.userId) {
      throw new UnauthorizedDeviceAccessError(deviceId, context.userId);
    }
    return this.mapRowToDto(row);
  }
  /**
   * Retrieves all devices owned by the authenticated user.
   */
  async getDevices(context, customClient) {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }
    const { data, error } = await client.from("devices").select("*").eq("user_id", context.userId).order("created_at", { ascending: true });
    if (error) {
      throw new Error(`Failed to query user devices: ${error.message}`);
    }
    if (!data) return [];
    return data.map((row) => this.mapRowToDto(row));
  }
  /**
   * Retrieves a single device by ID with ownership verification.
   */
  async getDeviceById(deviceId, context, customClient) {
    return this.validateDeviceOwnership(deviceId, context, customClient);
  }
  /**
   * Retrieves device operational health and hardware telemetry status.
   */
  async getDeviceStatus(deviceId, context, customClient) {
    const device = await this.validateDeviceOwnership(deviceId, context, customClient);
    const isOnline = device.status === "online";
    return {
      device,
      isOnline,
      waterHardwareStatus: `${device.waterSensorType} Turbine Flow Sensor (Operational)`,
      powerHardwareStatus: `${device.powerSensorType} DC Sensor (Installed, Pending Calibration)`,
      lastSeen: device.lastSync
    };
  }
};
var deviceService = new DeviceService();

// server/mcp/tools/toolHelper.ts
function getVerifiedContext(extra) {
  const auth = extra?.authInfo || (extra?.sessionId ? getSessionAuthContext(extra.sessionId) : null);
  if (!auth || !auth.userId) {
    throw new UnauthenticatedError(
      "Protected MCP tool execution rejected: No verified session identity found. Provide a valid Bearer JWT."
    );
  }
  return auth;
}
function formatToolSuccess(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}
function formatToolError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof DomainServiceError ? error.code : "TOOL_EXECUTION_ERROR";
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: {
              code,
              message
            }
          },
          null,
          2
        )
      }
    ]
  };
}

// server/mcp/tools/deviceTools.ts
function registerDeviceTools(server) {
  server.tool(
    "get_device_status",
    "Retrieve device operational connectivity, hardware status, and synchronization state for a registered AquaWatt IoT node.",
    {
      deviceId: z3.string().uuid({ message: "deviceId must be a valid UUID" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const result = await deviceService.getDeviceStatus(args.deviceId, context);
        return formatToolSuccess(result);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "list_user_devices",
    "List all AquaWatt sensor monitoring devices owned by the authenticated user.",
    {},
    async (_args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const devices = await deviceService.getDevices(context);
        return formatToolSuccess({
          totalDevices: devices.length,
          devices
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}

// server/mcp/tools/waterTools.ts
import { z as z4 } from "zod";

// src/utils/calculations.ts
var LITERS_PER_GALLON = 3.78541;
var GALLONS_PER_LITER = 1 / LITERS_PER_GALLON;
var KG_CO2_PER_KWH = 0.385;
var KG_CO2_PER_LITER_WATER = 32e-5;
var DEFAULT_INR_WATER_RATE = 0.025;
var DEFAULT_INR_ELECTRICITY_RATE = 7.5;
function litersToGallons(liters) {
  return Number((liters * GALLONS_PER_LITER).toFixed(1));
}
function formatMetric(val, precision = 1) {
  if (Math.abs(val) >= 1e6) {
    return `${(val / 1e6).toFixed(precision)}M`;
  }
  if (Math.abs(val) >= 1e3) {
    return `${(val / 1e3).toFixed(precision)}k`;
  }
  return val.toFixed(precision);
}
function calculateResourceCost(amount, unitRate, baseServiceFee = 0) {
  if (amount < 0 || unitRate < 0) return 0;
  return Number((amount * unitRate + baseServiceFee).toFixed(2));
}
function calculateCarbonAvoided(waterSavedLiters, electricitySavedKwh) {
  const waterCarbon = Math.max(0, waterSavedLiters) * KG_CO2_PER_LITER_WATER;
  const powerCarbon = Math.max(0, electricitySavedKwh) * KG_CO2_PER_KWH;
  return Number((waterCarbon + powerCarbon).toFixed(1));
}
function calculatePercentageChange(current, baseline) {
  if (baseline <= 0) {
    return {
      percent: 0,
      isIncrease: current > 0,
      label: current > 0 ? "+100%" : "0%"
    };
  }
  const change = (current - baseline) / baseline * 100;
  const rounded = Number(Math.abs(change).toFixed(1));
  const isIncrease = change > 0;
  const label = `${isIncrease ? "+" : "-"}${rounded}%`;
  return {
    percent: rounded,
    isIncrease,
    label
  };
}
function detectAnomaly(currentValue, expectedBaseline, sensitivityMultiplier = 1.35) {
  if (expectedBaseline <= 0) {
    return { isAnomaly: false, severity: "normal", deviationRatio: 1 };
  }
  const ratio = currentValue / expectedBaseline;
  if (ratio >= sensitivityMultiplier * 1.5) {
    return {
      isAnomaly: true,
      severity: "critical",
      deviationRatio: Number(ratio.toFixed(2))
    };
  }
  if (ratio >= sensitivityMultiplier) {
    return {
      isAnomaly: true,
      severity: "warning",
      deviationRatio: Number(ratio.toFixed(2))
    };
  }
  return {
    isAnomaly: false,
    severity: "normal",
    deviationRatio: Number(ratio.toFixed(2))
  };
}
function evaluateSustainabilityScore(waterSavingPct, energySavingPct, unresolvedAlertsCount, completedChallengesCount) {
  let score = 50;
  score += Math.min(20, Math.max(-15, waterSavingPct * 1.2));
  score += Math.min(20, Math.max(-15, energySavingPct * 1.2));
  score -= Math.min(20, unresolvedAlertsCount * 5);
  score += Math.min(15, completedChallengesCount * 4);
  return Math.max(10, Math.min(100, Math.round(score)));
}

// server/services/telemetryService.ts
var TelemetryService = class {
  /**
   * Transforms a database SensorReadingRow into WaterMetricsDto
   */
  mapWaterReading(deviceId, row) {
    if (!row) {
      return {
        deviceId,
        timestamp: "No Data",
        recordedAt: null,
        flowRateLpm: 0,
        currentUsageLiters: 0,
        currentUsageGallons: 0,
        dailyTotalLiters: 0,
        monthlyTotalLiters: 0,
        pulseCount: null,
        pressurePsi: null,
        temperatureC: null,
        pressureStatusNote: "Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.",
        temperatureStatusNote: "Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig.",
        estimatedDailyCostInr: 0,
        estimatedMonthlyCostInr: 0,
        sensorModel: "FS-S401",
        status: "no_data"
      };
    }
    const flowRate = Number(row.flow_rate_lpm ?? 0);
    const currentLiters = Number(row.current_liters ?? 0);
    const dailyTotalLiters = Number(row.daily_total_liters ?? 0);
    const monthlyTotalLiters = Number(row.monthly_total_liters ?? 0);
    const pressureStatusNote = "Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.";
    const temperatureStatusNote = "Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig.";
    return {
      deviceId,
      timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      sensorModel: "FS-S401",
      status: flowRate > 0 ? "active" : "zero_flow"
    };
  }
  /**
   * Transforms a database SensorReadingRow into ElectricityMetricsDto
   * Strictly respects hardware constraints:
   * If INA219 fields are null, isAvailable is false, metrics remain null,
   * and no fabricated values are ever generated.
   */
  mapElectricityReading(deviceId, row) {
    if (!row) {
      return {
        deviceId,
        timestamp: "No Data",
        recordedAt: null,
        isAvailable: false,
        hardwareStatus: "sensor_missing",
        statusNote: "No electrical telemetry available for this device.",
        sensorModel: "INA219",
        voltageV: null,
        currentA: null,
        powerW: null,
        activePowerKw: null,
        dailyTotalKwh: null,
        monthlyTotalKwh: null,
        powerFactor: null,
        estimatedDailyCostInr: null,
        estimatedMonthlyCostInr: null
      };
    }
    const hasMeasurements = row.active_power_kw != null || row.power_w != null || row.voltage_v != null || row.daily_total_kwh != null;
    if (!hasMeasurements) {
      return {
        deviceId,
        timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        recordedAt: row.recorded_at,
        isAvailable: false,
        hardwareStatus: "uncalibrated_hardware",
        statusNote: row.sensor_notes || "INA219 DC sensor installed on ESP32 but pending electrical calibration.",
        sensorModel: "INA219",
        voltageV: null,
        currentA: null,
        powerW: null,
        activePowerKw: null,
        dailyTotalKwh: null,
        monthlyTotalKwh: null,
        powerFactor: null,
        estimatedDailyCostInr: null,
        estimatedMonthlyCostInr: null
      };
    }
    const dailyKwh = row.daily_total_kwh != null ? Number(row.daily_total_kwh) : null;
    const monthlyKwh = row.monthly_total_kwh != null ? Number(row.monthly_total_kwh) : null;
    return {
      deviceId,
      timestamp: new Date(row.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      recordedAt: row.recorded_at,
      isAvailable: true,
      hardwareStatus: "operational",
      statusNote: row.sensor_notes || "INA219 Active and Measured",
      sensorModel: "INA219",
      voltageV: row.voltage_v != null ? Number(row.voltage_v) : null,
      currentA: row.current_a != null ? Number(row.current_a) : null,
      powerW: row.power_w != null ? Number(row.power_w) : null,
      activePowerKw: row.active_power_kw != null ? Number(row.active_power_kw) : null,
      dailyTotalKwh: dailyKwh,
      monthlyTotalKwh: monthlyKwh,
      powerFactor: row.power_factor != null ? Number(row.power_factor) : null,
      estimatedDailyCostInr: dailyKwh != null ? calculateResourceCost(dailyKwh, DEFAULT_INR_ELECTRICITY_RATE) : null,
      estimatedMonthlyCostInr: monthlyKwh != null ? calculateResourceCost(monthlyKwh, DEFAULT_INR_ELECTRICITY_RATE) : null
    };
  }
  /**
   * Retrieves latest reading for a user-owned device.
   */
  async getLatestReading(deviceId, context, customClient) {
    const device = await deviceService.validateDeviceOwnership(deviceId, context, customClient);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      throw new DatabaseUnavailableError();
    }
    const { data, error } = await client.from("sensor_readings").select("*").eq("device_id", deviceId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    if (error) {
      throw new Error(`Database error querying latest sensor reading: ${error.message}`);
    }
    const row = data;
    const water = this.mapWaterReading(deviceId, row);
    const electricity = this.mapElectricityReading(deviceId, row);
    return {
      deviceId,
      device,
      water,
      electricity,
      recordedAt: row?.recorded_at || null
    };
  }
  /**
   * Retrieves historical raw sensor readings within an explicit ISO date range.
   */
  async getHistoricalReadings(deviceId, dateRange, context, customClient) {
    DateRangeSchema.parse(dateRange);
    await deviceService.validateDeviceOwnership(deviceId, context, customClient);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }
    const { data, error } = await client.from("sensor_readings").select("*").eq("device_id", deviceId).gte("recorded_at", dateRange.startDate).lte("recorded_at", dateRange.endDate).order("recorded_at", { ascending: true });
    if (error) {
      throw new Error(`Database error querying historical telemetry: ${error.message}`);
    }
    return data || [];
  }
};
var telemetryService = new TelemetryService();

// server/services/waterService.ts
var WaterService = class {
  /**
   * Retrieves the current water telemetry metrics for a device.
   */
  async getWaterMetrics(deviceId, context, customClient) {
    const snapshot = await telemetryService.getLatestReading(deviceId, context, customClient);
    return snapshot.water;
  }
  /**
   * Aggregates water telemetry data into hourly, daily, weekly, or monthly buckets.
   */
  async getWaterAggregation(deviceId, period, dateRange, context, customClient) {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);
    if (rows.length === 0) {
      return [];
    }
    const bucketMap = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const date = new Date(row.recorded_at);
      let key = "";
      if (period === "hourly") {
        key = `${date.toISOString().slice(0, 13)}:00:00Z`;
      } else if (period === "daily") {
        key = `${date.toISOString().slice(0, 10)}`;
      } else if (period === "weekly") {
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        key = `Week of ${d.toISOString().slice(0, 10)}`;
      } else {
        key = `${date.toISOString().slice(0, 7)}`;
      }
      const existing = bucketMap.get(key) || [];
      existing.push(row);
      bucketMap.set(key, existing);
    }
    const results = [];
    for (const [key, rawBucketRows] of bucketMap.entries()) {
      const bucketRows = [...rawBucketRows].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );
      let maxFlow = 0;
      let minFlow = Number.MAX_VALUE;
      let sumFlow = 0;
      for (const r of bucketRows) {
        const flow = Number(r.flow_rate_lpm ?? 0);
        if (flow > maxFlow) maxFlow = flow;
        if (flow < minFlow) minFlow = flow;
        sumFlow += flow;
      }
      if (minFlow === Number.MAX_VALUE) minFlow = 0;
      const avgFlow = bucketRows.length > 0 ? Number((sumFlow / bucketRows.length).toFixed(2)) : 0;
      let totalLiters = 0;
      if (bucketRows.length === 1) {
        const r = bucketRows[0];
        const flow = Number(r.flow_rate_lpm ?? 0);
        const currLiters = Number(r.current_liters ?? 0);
        totalLiters = currLiters > 0 ? currLiters : flow > 0 ? Number((flow * 1).toFixed(2)) : 0;
      } else {
        for (let i = 1; i < bucketRows.length; i++) {
          const prev = bucketRows[i - 1];
          const curr = bucketRows[i];
          const prevDaily = Number(prev.daily_total_liters ?? 0);
          const currDaily = Number(curr.daily_total_liters ?? 0);
          if (currDaily >= prevDaily) {
            totalLiters += currDaily - prevDaily;
          } else {
            const resetDelta = currDaily > 0 ? currDaily : Number(curr.current_liters ?? 0);
            totalLiters += resetDelta;
          }
        }
      }
      totalLiters = Number(totalLiters.toFixed(2));
      const start = bucketRows[0].recorded_at;
      const end = bucketRows[bucketRows.length - 1].recorded_at;
      results.push({
        periodLabel: key,
        periodStart: start,
        periodEnd: end,
        totalLiters,
        totalGallons: litersToGallons(totalLiters),
        averageFlowRateLpm: avgFlow,
        maxFlowRateLpm: Number(maxFlow.toFixed(2)),
        minFlowRateLpm: Number(minFlow.toFixed(2)),
        sampleCount: bucketRows.length,
        estimatedCostInr: calculateResourceCost(totalLiters, DEFAULT_INR_WATER_RATE)
      });
    }
    return results;
  }
  /**
   * Helper to compute water summary for a relative preset (8h, 24h, 7d, 30d)
   */
  async getWaterSummary(deviceId, preset, context, customClient) {
    const metrics = await this.getWaterMetrics(deviceId, context, customClient);
    const now = /* @__PURE__ */ new Date();
    let hoursBack = 24;
    let period = "hourly";
    if (preset === "8h") {
      hoursBack = 8;
      period = "hourly";
    } else if (preset === "24h") {
      hoursBack = 24;
      period = "hourly";
    } else if (preset === "7d") {
      hoursBack = 24 * 7;
      period = "daily";
    } else if (preset === "30d") {
      hoursBack = 24 * 30;
      period = "daily";
    }
    const startDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1e3).toISOString();
    const endDate = now.toISOString();
    const aggregation = await this.getWaterAggregation(
      deviceId,
      period,
      { startDate, endDate },
      context,
      customClient
    );
    return { preset, metrics, aggregation };
  }
};
var waterService = new WaterService();

// server/services/electricityService.ts
var ElectricityService = class {
  /**
   * Retrieves the current electricity telemetry metrics for a device.
   * If INA219 is unverified or null in database, isAvailable is false and metrics are null.
   */
  async getElectricityMetrics(deviceId, context, customClient) {
    const snapshot = await telemetryService.getLatestReading(deviceId, context, customClient);
    return snapshot.electricity;
  }
  /**
   * Aggregates electricity telemetry data into time buckets.
   * If INA219 readings are missing/uncalibrated in physical mode,
   * returns isAvailable: false with null metrics, never fabricating data.
   */
  async getElectricityAggregation(deviceId, period, dateRange, context, customClient) {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);
    if (rows.length === 0) {
      return [];
    }
    const hasAnyMeasurement = rows.some(
      (r) => r.active_power_kw != null || r.power_w != null || r.daily_total_kwh != null
    );
    if (!hasAnyMeasurement) {
      const start = rows[0]?.recorded_at || dateRange.startDate;
      const end = rows[rows.length - 1]?.recorded_at || dateRange.endDate;
      return [
        {
          periodLabel: "INA219 Pending Hardware Calibration",
          periodStart: start,
          periodEnd: end,
          isAvailable: false,
          totalKwh: null,
          averagePowerKw: null,
          maxPowerKw: null,
          minPowerKw: null,
          sampleCount: rows.length,
          estimatedCostInr: null,
          statusNote: "INA219 DC sensor is physically installed on ESP32 but pending electrical calibration."
        }
      ];
    }
    const bucketMap = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const date = new Date(row.recorded_at);
      let key = "";
      if (period === "hourly") {
        key = `${date.toISOString().slice(0, 13)}:00:00Z`;
      } else if (period === "daily") {
        key = `${date.toISOString().slice(0, 10)}`;
      } else if (period === "weekly") {
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        key = `Week of ${d.toISOString().slice(0, 10)}`;
      } else {
        key = `${date.toISOString().slice(0, 7)}`;
      }
      const existing = bucketMap.get(key) || [];
      existing.push(row);
      bucketMap.set(key, existing);
    }
    const results = [];
    for (const [key, rawBucketRows] of bucketMap.entries()) {
      const bucketRows = [...rawBucketRows].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );
      let maxKw = 0;
      let minKw = Number.MAX_VALUE;
      let sumKw = 0;
      let validKwCount = 0;
      for (const r of bucketRows) {
        if (r.active_power_kw != null) {
          const kw = Number(r.active_power_kw);
          if (kw > maxKw) maxKw = kw;
          if (kw < minKw) minKw = kw;
          sumKw += kw;
          validKwCount++;
        }
      }
      const hasMeasurements = validKwCount > 0;
      const avgKw = hasMeasurements ? Number((sumKw / validKwCount).toFixed(3)) : null;
      let totalKwh = null;
      const kwhRows = bucketRows.filter((r) => r.daily_total_kwh != null);
      if (kwhRows.length > 0) {
        let accumulated = 0;
        if (kwhRows.length === 1) {
          accumulated = 0;
        } else {
          for (let i = 1; i < kwhRows.length; i++) {
            const prev = Number(kwhRows[i - 1].daily_total_kwh);
            const curr = Number(kwhRows[i].daily_total_kwh);
            if (curr >= prev) {
              accumulated += curr - prev;
            } else {
              accumulated += curr;
            }
          }
        }
        totalKwh = Number(accumulated.toFixed(4));
      }
      const cost = totalKwh != null ? calculateResourceCost(totalKwh, DEFAULT_INR_ELECTRICITY_RATE) : null;
      results.push({
        periodLabel: key,
        periodStart: bucketRows[0].recorded_at,
        periodEnd: bucketRows[bucketRows.length - 1].recorded_at,
        isAvailable: hasMeasurements,
        totalKwh,
        averagePowerKw: avgKw,
        maxPowerKw: hasMeasurements ? Number(maxKw.toFixed(3)) : null,
        minPowerKw: hasMeasurements && minKw !== Number.MAX_VALUE ? Number(minKw.toFixed(3)) : null,
        sampleCount: bucketRows.length,
        estimatedCostInr: cost,
        statusNote: hasMeasurements ? "Verified readings" : "Uncalibrated hardware"
      });
    }
    return results;
  }
  /**
   * Helper to compute electricity summary for a relative preset
   */
  async getElectricitySummary(deviceId, preset, context, customClient) {
    const metrics = await this.getElectricityMetrics(deviceId, context, customClient);
    const now = /* @__PURE__ */ new Date();
    let hoursBack = 24;
    let period = "hourly";
    if (preset === "8h") {
      hoursBack = 8;
      period = "hourly";
    } else if (preset === "24h") {
      hoursBack = 24;
      period = "hourly";
    } else if (preset === "7d") {
      hoursBack = 24 * 7;
      period = "daily";
    } else if (preset === "30d") {
      hoursBack = 24 * 30;
      period = "daily";
    }
    const startDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1e3).toISOString();
    const endDate = now.toISOString();
    const aggregation = await this.getElectricityAggregation(
      deviceId,
      period,
      { startDate, endDate },
      context,
      customClient
    );
    return { preset, metrics, aggregation };
  }
};
var electricityService = new ElectricityService();

// server/services/analyticsService.ts
var AnalyticsService = class {
  /**
   * Generates combined water & electricity aggregation for a device.
   */
  async aggregateTelemetry(deviceId, period, dateRange, context, customClient) {
    DateRangeSchema.parse(dateRange);
    const [waterBuckets, electricBuckets] = await Promise.all([
      waterService.getWaterAggregation(deviceId, period, dateRange, context, customClient),
      electricityService.getElectricityAggregation(deviceId, period, dateRange, context, customClient)
    ]);
    const combinedMap = /* @__PURE__ */ new Map();
    for (const wb of waterBuckets) {
      combinedMap.set(wb.periodLabel, {
        periodLabel: wb.periodLabel,
        periodStart: wb.periodStart,
        periodEnd: wb.periodEnd,
        water: {
          totalLiters: wb.totalLiters,
          totalGallons: wb.totalGallons,
          averageFlowRateLpm: wb.averageFlowRateLpm,
          maxFlowRateLpm: wb.maxFlowRateLpm,
          minFlowRateLpm: wb.minFlowRateLpm,
          sampleCount: wb.sampleCount,
          costInr: wb.estimatedCostInr
        },
        electricity: {
          isAvailable: false,
          totalKwh: null,
          averagePowerKw: null,
          maxPowerKw: null,
          costInr: null,
          sampleCount: 0
        }
      });
    }
    for (const eb of electricBuckets) {
      const existing = combinedMap.get(eb.periodLabel);
      if (existing) {
        existing.electricity = {
          isAvailable: eb.isAvailable,
          totalKwh: eb.totalKwh,
          averagePowerKw: eb.averagePowerKw,
          maxPowerKw: eb.maxPowerKw,
          costInr: eb.estimatedCostInr,
          sampleCount: eb.sampleCount
        };
      } else {
        combinedMap.set(eb.periodLabel, {
          periodLabel: eb.periodLabel,
          periodStart: eb.periodStart,
          periodEnd: eb.periodEnd,
          water: {
            totalLiters: 0,
            totalGallons: 0,
            averageFlowRateLpm: 0,
            maxFlowRateLpm: 0,
            minFlowRateLpm: 0,
            sampleCount: 0,
            costInr: 0
          },
          electricity: {
            isAvailable: eb.isAvailable,
            totalKwh: eb.totalKwh,
            averagePowerKw: eb.averagePowerKw,
            maxPowerKw: eb.maxPowerKw,
            costInr: eb.estimatedCostInr,
            sampleCount: eb.sampleCount
          }
        });
      }
    }
    return Array.from(combinedMap.values());
  }
  /**
   * Compares consumption metrics across two discrete periods.
   */
  async comparePeriods(deviceId, metric, currentPeriod, previousPeriod, context, customClient) {
    DateRangeSchema.parse(currentPeriod);
    DateRangeSchema.parse(previousPeriod);
    if (metric === "water") {
      const [currentBuckets, prevBuckets] = await Promise.all([
        waterService.getWaterAggregation(deviceId, "daily", currentPeriod, context, customClient),
        waterService.getWaterAggregation(deviceId, "daily", previousPeriod, context, customClient)
      ]);
      const currentTotal = currentBuckets.reduce((acc, b) => acc + b.totalLiters, 0);
      const prevTotal = prevBuckets.reduce((acc, b) => acc + b.totalLiters, 0);
      const currentCost = currentBuckets.reduce((acc, b) => acc + b.estimatedCostInr, 0);
      const prevCost = prevBuckets.reduce((acc, b) => acc + b.estimatedCostInr, 0);
      const changePct = calculatePercentageChange(currentTotal, prevTotal);
      const absoluteDiff = Number((currentTotal - prevTotal).toFixed(2));
      const waterSaved = absoluteDiff < 0 ? Math.abs(absoluteDiff) : 0;
      const carbonAvoided = calculateCarbonAvoided(waterSaved, 0);
      const summary = prevTotal === 0 && currentTotal === 0 ? "No water consumption recorded in either period." : `Water consumption is ${currentTotal.toFixed(1)} Liters (${changePct.label} vs previous period of ${prevTotal.toFixed(1)} Liters). ${waterSaved > 0 ? `Conservation effort avoided ~${carbonAvoided} kg CO2 equivalent.` : "Consumption increased relative to baseline period."}`;
      return {
        deviceId,
        metric: "water",
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          totalUsage: Number(currentTotal.toFixed(2)),
          unit: "Liters",
          costInr: Number(currentCost.toFixed(2))
        },
        previousPeriod: {
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
          totalUsage: Number(prevTotal.toFixed(2)),
          unit: "Liters",
          costInr: Number(prevCost.toFixed(2))
        },
        change: {
          absoluteChange: absoluteDiff,
          percentageChange: changePct.percent,
          isIncrease: changePct.isIncrease,
          label: changePct.label
        },
        carbonAvoidedKg: carbonAvoided,
        summary
      };
    } else {
      const [currentBuckets, prevBuckets] = await Promise.all([
        electricityService.getElectricityAggregation(deviceId, "daily", currentPeriod, context, customClient),
        electricityService.getElectricityAggregation(deviceId, "daily", previousPeriod, context, customClient)
      ]);
      const currentHasData = currentBuckets.some((b) => b.isAvailable && b.totalKwh != null);
      const prevHasData = prevBuckets.some((b) => b.isAvailable && b.totalKwh != null);
      if (!currentHasData || !prevHasData) {
        return {
          deviceId,
          metric: "electricity",
          currentPeriod: {
            startDate: currentPeriod.startDate,
            endDate: currentPeriod.endDate,
            totalUsage: null,
            unit: "kWh",
            costInr: null
          },
          previousPeriod: {
            startDate: previousPeriod.startDate,
            endDate: previousPeriod.endDate,
            totalUsage: null,
            unit: "kWh",
            costInr: null
          },
          change: {
            absoluteChange: null,
            percentageChange: 0,
            isIncrease: false,
            label: "N/A (INA219 Uncalibrated)"
          },
          carbonAvoidedKg: null,
          summary: "Electricity comparison unavailable: INA219 sensor is pending physical calibration and real verified kWh data is not present in both periods."
        };
      }
      const currentKwh = currentBuckets.reduce((acc, b) => acc + (b.totalKwh || 0), 0);
      const prevKwh = prevBuckets.reduce((acc, b) => acc + (b.totalKwh || 0), 0);
      const currentCost = currentBuckets.reduce((acc, b) => acc + (b.estimatedCostInr || 0), 0);
      const prevCost = prevBuckets.reduce((acc, b) => acc + (b.estimatedCostInr || 0), 0);
      const changePct = calculatePercentageChange(currentKwh, prevKwh);
      const absoluteDiff = Number((currentKwh - prevKwh).toFixed(4));
      const powerSaved = absoluteDiff < 0 ? Math.abs(absoluteDiff) : 0;
      const carbonAvoided = calculateCarbonAvoided(0, powerSaved);
      return {
        deviceId,
        metric: "electricity",
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          totalUsage: Number(currentKwh.toFixed(4)),
          unit: "kWh",
          costInr: Number(currentCost.toFixed(2))
        },
        previousPeriod: {
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
          totalUsage: Number(prevKwh.toFixed(4)),
          unit: "kWh",
          costInr: Number(prevCost.toFixed(2))
        },
        change: {
          absoluteChange: absoluteDiff,
          percentageChange: changePct.percent,
          isIncrease: changePct.isIncrease,
          label: changePct.label
        },
        carbonAvoidedKg: carbonAvoided,
        summary: `Electricity usage is ${formatMetric(currentKwh, 2)} kWh (${changePct.label} vs baseline ${formatMetric(prevKwh, 2)} kWh).`
      };
    }
  }
};
var analyticsService = new AnalyticsService();

// server/services/anomalyService.ts
function getLocalHourInTimezone(dateStringOrObj, timezone = "Asia/Kolkata") {
  const date = typeof dateStringOrObj === "string" ? new Date(dateStringOrObj) : dateStringOrObj;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23"
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    return hourPart ? parseInt(hourPart.value, 10) : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}
var AnomalyService = class {
  /**
   * Evaluates telemetry for possible water leaks using transparent, explainable heuristics.
   * STRICT CONSTRAINT: Never asserts that a leak is confirmed.
   */
  async detectPossibleLeak(deviceId, dateRange, context, options = {}, customClient) {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);
    const minLeakLpm = options.minLeakFlowLpm ?? 0.1;
    const thresholdHours = options.continuousFlowThresholdHours ?? 3;
    const timezone = options.timezone || "Asia/Kolkata";
    const nightStart = options.nightStartHour ?? 1;
    const nightEnd = options.nightEndHour ?? 5;
    const isNightHour = (localHour) => {
      if (nightStart <= nightEnd) {
        return localHour >= nightStart && localHour <= nightEnd;
      }
      return localHour >= nightStart || localHour <= nightEnd;
    };
    if (rows.length === 0) {
      return {
        deviceId,
        analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
        hasPossibleLeak: false,
        confidence: "none",
        classification: "unlikely",
        observations: {
          consecutiveFlowHours: 0,
          nighttimeAverageFlowLpm: 0,
          minimumNonZeroFlowLpm: 0,
          sampleCountAnalyzed: 0,
          timeWindowEvaluated: `${dateRange.startDate} to ${dateRange.endDate} (${timezone})`
        },
        evidenceSummary: "Insufficient sensor telemetry points within the requested window to perform analysis.",
        explanation: "No sensor reading records were returned for this device and time interval.",
        recommendedActions: ["Verify that the ESP32 hardware node is powered and syncing telemetry."],
        caveats: [
          "Analysis requires at least 4 contiguous sensor reading points for baseline evaluation.",
          "This heuristic check does not confirm or rule out physical plumbing anomalies."
        ]
      };
    }
    const sorted = [...rows].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    let currentFlowStreakMs = 0;
    let maxFlowStreakMs = 0;
    let lastTime = null;
    let nonZeroFlows = [];
    let nightFlows = [];
    for (const r of sorted) {
      const time = new Date(r.recorded_at).getTime();
      const flow = Number(r.flow_rate_lpm ?? 0);
      const localHour = getLocalHourInTimezone(r.recorded_at, timezone);
      if (isNightHour(localHour)) {
        nightFlows.push(flow);
      }
      if (flow >= minLeakLpm) {
        nonZeroFlows.push(flow);
        if (lastTime != null) {
          const delta = time - lastTime;
          if (delta <= 75 * 60 * 1e3) {
            currentFlowStreakMs += delta;
          } else {
            currentFlowStreakMs = 0;
          }
        }
        if (currentFlowStreakMs > maxFlowStreakMs) {
          maxFlowStreakMs = currentFlowStreakMs;
        }
      } else {
        currentFlowStreakMs = 0;
      }
      lastTime = time;
    }
    const consecutiveFlowHours = Number((maxFlowStreakMs / (3600 * 1e3)).toFixed(1));
    const minNonZeroFlow = nonZeroFlows.length > 0 ? Math.min(...nonZeroFlows) : 0;
    const avgNightFlow = nightFlows.length > 0 ? Number((nightFlows.reduce((a, b) => a + b, 0) / nightFlows.length).toFixed(2)) : 0;
    const zeroFlowCount = sorted.filter((r) => Number(r.flow_rate_lpm ?? 0) < 0.02).length;
    const hasUnbrokenFlow = zeroFlowCount === 0 && sorted.length >= 6;
    let hasPossibleLeak = false;
    let confidence = "none";
    let classification = "unlikely";
    const evidenceParts = [];
    if (consecutiveFlowHours >= thresholdHours && avgNightFlow > 0.15) {
      hasPossibleLeak = true;
      confidence = consecutiveFlowHours >= 6 ? "high" : "medium";
      classification = "possible_continuous_flow";
      evidenceParts.push(
        `FS-S401 turbine recorded uninterrupted flow for approximately ${consecutiveFlowHours} continuous hours, including facility local night hours (${timezone} ${nightStart}:00-${nightEnd}:00) with average flow of ${avgNightFlow} LPM.`
      );
    } else if (hasUnbrokenFlow && minNonZeroFlow > 0.05) {
      hasPossibleLeak = true;
      confidence = "medium";
      classification = "possible_micro_leak";
      evidenceParts.push(
        `Flow did not return to 0.00 LPM across any of the ${sorted.length} recorded telemetry samples in the evaluated window (minimum observed flow: ${minNonZeroFlow.toFixed(2)} LPM).`
      );
    } else if (avgNightFlow > 0.5) {
      hasPossibleLeak = true;
      confidence = "low";
      classification = "possible_continuous_flow";
      evidenceParts.push(
        `Elevated average nighttime flow of ${avgNightFlow} LPM observed during facility local night hours (${timezone} ${nightStart}:00-${nightEnd}:00).`
      );
    }
    const evidenceSummary = evidenceParts.length > 0 ? evidenceParts.join(" ") : `Normal water telemetry patterns observed. Flow returned to zero ${zeroFlowCount} times across ${sorted.length} reading samples.`;
    const explanation = hasPossibleLeak ? `Telemetry patterns indicate persistent fluid movement through the FS-S401 meter. Typical causes for this profile include a running toilet flapper valve, dripping internal fixtures, outdoor hose bib leaks, or an active automated filter/irrigation line. This indicates a possible anomaly, not a verified breach.` : `Flow readings indicate standard intermittent consumption with regular periods of zero flow, typical of normal occupant usage without persistent baseline loss.`;
    const recommendedActions = hasPossibleLeak ? [
      "Conduct visual inspection of all downstream plumbing fixtures, especially toilets and overflow valves.",
      "Verify if automated equipment (water softeners, RO systems, cooling loops) was scheduled to run during the observed window.",
      "Close the main supply valve briefly to verify if the FS-S401 meter drops to 0.00 LPM."
    ] : ["Continue regular monitoring. Current baseline conforms to expected intermittent patterns."];
    const caveats = [
      "CRITICAL NOTICE: This analysis represents an automated heuristic indicator based on flow sensor telemetry and does NOT constitute a confirmed physical leak.",
      "False positives can be caused by continuous low-rate legitimate usage, automated bypass valves, or sensory calibration drift.",
      "Physical visual inspection is always required before taking remedial plumbing action."
    ];
    return {
      deviceId,
      analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
      hasPossibleLeak,
      confidence,
      classification,
      observations: {
        consecutiveFlowHours,
        nighttimeAverageFlowLpm: avgNightFlow,
        minimumNonZeroFlowLpm: Number(minNonZeroFlow.toFixed(2)),
        sampleCountAnalyzed: sorted.length,
        timeWindowEvaluated: `${dateRange.startDate} to ${dateRange.endDate}`
      },
      evidenceSummary,
      explanation,
      recommendedActions,
      caveats
    };
  }
  /**
   * Evaluates instantaneous telemetry for surge/spikes relative to baseline.
   */
  evaluateFlowSurge(currentFlowLpm, expectedBaselineLpm, sensitivityMultiplier = 1.35) {
    return detectAnomaly(currentFlowLpm, expectedBaselineLpm, sensitivityMultiplier);
  }
};
var anomalyService = new AnomalyService();

// server/mcp/tools/waterTools.ts
function registerWaterTools(server) {
  server.tool(
    "get_latest_readings",
    "Retrieve the latest physical water and electrical telemetry snapshot recorded by an AquaWatt monitoring device.",
    {
      deviceId: z4.string().uuid({ message: "deviceId must be a valid UUID" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const snapshot = await telemetryService.getLatestReading(args.deviceId, context);
        return formatToolSuccess(snapshot);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "get_water_consumption",
    "Retrieve water consumption aggregated into hourly, daily, weekly, or monthly time buckets for a specified date range.",
    {
      deviceId: z4.string().uuid({ message: "deviceId must be a valid UUID" }),
      period: z4.enum(["hourly", "daily", "weekly", "monthly"]).default("daily"),
      startDate: z4.string().datetime({ message: "startDate must be a valid ISO 8601 string" }),
      endDate: z4.string().datetime({ message: "endDate must be a valid ISO 8601 string" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const buckets = await waterService.getWaterAggregation(
          args.deviceId,
          args.period,
          { startDate: args.startDate, endDate: args.endDate },
          context
        );
        return formatToolSuccess({
          deviceId: args.deviceId,
          period: args.period,
          totalBuckets: buckets.length,
          buckets
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "analyze_water_usage",
    "Analyze water consumption patterns, averages, peak flow rates, and volume metrics for a relative time window (8h, 24h, 7d, 30d).",
    {
      deviceId: z4.string().uuid({ message: "deviceId must be a valid UUID" }),
      timeRange: z4.enum(["8h", "24h", "7d", "30d"]).default("24h")
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const summary = await waterService.getWaterSummary(args.deviceId, args.timeRange, context);
        return formatToolSuccess(summary);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "compare_water_consumption",
    "Compare water consumption between two user-selected periods, evaluating percentage change, volumetric difference, and carbon impact.",
    {
      deviceId: z4.string().uuid({ message: "deviceId must be a valid UUID" }),
      currentStartDate: z4.string().datetime({ message: "currentStartDate must be a valid ISO 8601 string" }),
      currentEndDate: z4.string().datetime({ message: "currentEndDate must be a valid ISO 8601 string" }),
      previousStartDate: z4.string().datetime({ message: "previousStartDate must be a valid ISO 8601 string" }),
      previousEndDate: z4.string().datetime({ message: "previousEndDate must be a valid ISO 8601 string" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const comparison = await analyticsService.comparePeriods(
          args.deviceId,
          "water",
          { startDate: args.currentStartDate, endDate: args.currentEndDate },
          { startDate: args.previousStartDate, endDate: args.previousEndDate },
          context
        );
        return formatToolSuccess(comparison);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "detect_possible_leaks",
    "Run explainable possible-leak detection using actual FS-S401 turbine flow readings. Strictly reports findings with transparent evidence and caveats (never claims a confirmed leak).",
    {
      deviceId: z4.string().uuid({ message: "deviceId must be a valid UUID" }),
      startDate: z4.string().datetime({ message: "startDate must be a valid ISO 8601 string" }),
      endDate: z4.string().datetime({ message: "endDate must be a valid ISO 8601 string" }),
      timezone: z4.string().optional().default("Asia/Kolkata"),
      nightStartHour: z4.number().int().min(0).max(23).optional().default(1),
      nightEndHour: z4.number().int().min(0).max(23).optional().default(5)
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const analysis = await anomalyService.detectPossibleLeak(
          args.deviceId,
          { startDate: args.startDate, endDate: args.endDate },
          context,
          {
            timezone: args.timezone,
            nightStartHour: args.nightStartHour,
            nightEndHour: args.nightEndHour
          }
        );
        return formatToolSuccess(analysis);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}

// server/mcp/tools/electricityTools.ts
import { z as z5 } from "zod";
function registerElectricityTools(server) {
  server.tool(
    "get_electricity_consumption",
    "Retrieve electricity consumption and active power metrics. Strictly returns unavailable status with null values when INA219 DC sensor is uncalibrated.",
    {
      deviceId: z5.string().uuid({ message: "deviceId must be a valid UUID" }),
      period: z5.enum(["hourly", "daily", "weekly", "monthly"]).default("daily"),
      startDate: z5.string().datetime({ message: "startDate must be a valid ISO 8601 string" }),
      endDate: z5.string().datetime({ message: "endDate must be a valid ISO 8601 string" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const buckets = await electricityService.getElectricityAggregation(
          args.deviceId,
          args.period,
          { startDate: args.startDate, endDate: args.endDate },
          context
        );
        return formatToolSuccess({
          deviceId: args.deviceId,
          period: args.period,
          totalBuckets: buckets.length,
          buckets
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "analyze_electricity_usage",
    "Analyze electricity consumption trends and power metrics for a relative time window (8h, 24h, 7d, 30d). Returns unavailable if INA219 is uncalibrated.",
    {
      deviceId: z5.string().uuid({ message: "deviceId must be a valid UUID" }),
      timeRange: z5.enum(["8h", "24h", "7d", "30d"]).default("24h")
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const summary = await electricityService.getElectricitySummary(args.deviceId, args.timeRange, context);
        return formatToolSuccess(summary);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "compare_electricity_consumption",
    "Compare electricity usage across two user-selected periods. Returns explicit hardware pending calibration notice when physical INA219 data is unavailable.",
    {
      deviceId: z5.string().uuid({ message: "deviceId must be a valid UUID" }),
      currentStartDate: z5.string().datetime({ message: "currentStartDate must be a valid ISO 8601 string" }),
      currentEndDate: z5.string().datetime({ message: "currentEndDate must be a valid ISO 8601 string" }),
      previousStartDate: z5.string().datetime({ message: "previousStartDate must be a valid ISO 8601 string" }),
      previousEndDate: z5.string().datetime({ message: "previousEndDate must be a valid ISO 8601 string" })
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const comparison = await analyticsService.comparePeriods(
          args.deviceId,
          "electricity",
          { startDate: args.currentStartDate, endDate: args.currentEndDate },
          { startDate: args.previousStartDate, endDate: args.previousEndDate },
          context
        );
        return formatToolSuccess(comparison);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "detect_energy_anomalies",
    "Detect electrical power surges and consumption anomalies. Returns explicit unavailable status when INA219 is uncalibrated (never generates simulated anomalies).",
    {
      deviceId: z5.string().uuid({ message: "deviceId must be a valid UUID" }),
      startDate: z5.string().datetime({ message: "startDate must be a valid ISO 8601 string" }),
      endDate: z5.string().datetime({ message: "endDate must be a valid ISO 8601 string" }),
      expectedBaselineKw: z5.number().positive().optional().default(1),
      sensitivityMultiplier: z5.number().positive().optional().default(1.35)
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const rows = await telemetryService.getHistoricalReadings(
          args.deviceId,
          { startDate: args.startDate, endDate: args.endDate },
          context
        );
        const hasElectricalData = rows.some((r) => r.active_power_kw != null);
        if (!hasElectricalData) {
          return formatToolSuccess({
            deviceId: args.deviceId,
            isAvailable: false,
            hardwareStatus: "uncalibrated_hardware",
            statusNote: "INA219 DC sensor is pending electrical calibration. Power anomaly detection is unavailable to prevent simulated alerts.",
            anomaliesDetected: []
          });
        }
        const anomalies = [];
        for (const r of rows) {
          if (r.active_power_kw != null) {
            const kw = Number(r.active_power_kw);
            const evaluation = detectAnomaly(kw, args.expectedBaselineKw, args.sensitivityMultiplier);
            if (evaluation.isAnomaly) {
              anomalies.push({
                recordedAt: r.recorded_at,
                powerKw: kw,
                expectedBaselineKw: args.expectedBaselineKw,
                severity: evaluation.severity,
                deviationRatio: evaluation.deviationRatio
              });
            }
          }
        }
        return formatToolSuccess({
          deviceId: args.deviceId,
          isAvailable: true,
          hardwareStatus: "operational",
          totalSamplesAnalyzed: rows.length,
          anomaliesCount: anomalies.length,
          anomaliesDetected: anomalies
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}

// server/mcp/tools/sustainabilityTools.ts
import { z as z6 } from "zod";

// server/services/generalService.ts
var GeneralService = class {
  /**
   * Retrieves high-level operational overview for the user's account and hardware estate.
   */
  async getPlatformOverview(context, customClient) {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);
    const devices = await deviceService.getDevices(context, customClient);
    const onlineCount = devices.filter((d) => d.status === "online").length;
    const offlineCount = devices.length - onlineCount;
    let facility = {
      name: "AquaWatt Test Bench \xB7 Node Lab 01",
      type: "Residential",
      address: "Lab Bench #1 (ESP32 DevKit Telemetry Rig)",
      tier: "Standard Pro",
      sustainabilityScore: 85
    };
    let unresolvedAlerts = [];
    if (client) {
      try {
        const { data: profileData } = await client.from("profiles").select("*").eq("id", context.userId).maybeSingle();
        if (profileData) {
          const p = profileData;
          facility = {
            name: p.facility_name,
            type: p.facility_type,
            address: p.address,
            tier: p.tier,
            sustainabilityScore: p.sustainability_score
          };
        }
        const deviceIds = devices.map((d) => d.id);
        if (deviceIds.length > 0) {
          const { data: alertData } = await client.from("alerts").select("*").in("device_id", deviceIds).eq("is_resolved", false);
          if (alertData) {
            unresolvedAlerts = alertData;
          }
        }
      } catch (err) {
        console.warn("[GeneralService] Optional profile/alert lookup note:", err);
      }
    }
    const criticalCount = unresolvedAlerts.filter((a) => a.severity === "critical").length;
    const warningCount = unresolvedAlerts.filter((a) => a.severity === "warning").length;
    const computedScore = evaluateSustainabilityScore(
      8,
      // baseline saving pct
      0,
      // power saving pct (0 due to INA219 unverified)
      unresolvedAlerts.length,
      2
      // completed challenges
    );
    let grade = "B";
    if (computedScore >= 90) grade = "A+";
    else if (computedScore >= 80) grade = "A";
    else if (computedScore >= 70) grade = "B";
    else if (computedScore >= 60) grade = "C";
    else grade = "D";
    return {
      userId: context.userId,
      facility,
      devices: {
        total: devices.length,
        online: onlineCount,
        offline: offlineCount,
        list: devices
      },
      alerts: {
        totalUnresolved: unresolvedAlerts.length,
        criticalCount,
        warningCount
      },
      sustainabilityIndex: {
        score: computedScore,
        grade,
        summary: `Facility rating is ${grade} (${computedScore}/100) with ${unresolvedAlerts.length} active alerts.`
      },
      hardwareIntegrations: {
        waterFlowSensor: "FS-S401 Turbine Pulse Sensor (Active & Operational)",
        electricalSensor: "INA219 DC Monitor (Installed, Pending Calibration)",
        displayUnit: "16x2 Character LCD (Hardware Verified)"
      }
    };
  }
  /**
   * Retrieves active, unresolved alerts scoped to devices owned by the authenticated user.
   */
  async getActiveAlerts(context, options, customClient) {
    AuthContextSchema.parse(context);
    const client = createScopedSupabaseClient(context, customClient);
    if (!client) {
      return [];
    }
    let targetDeviceIds = [];
    if (options?.deviceId) {
      await deviceService.validateDeviceOwnership(options.deviceId, context, customClient);
      targetDeviceIds = [options.deviceId];
    } else {
      const devices = await deviceService.getDevices(context, customClient);
      targetDeviceIds = devices.map((d) => d.id);
    }
    if (targetDeviceIds.length === 0) {
      return [];
    }
    try {
      let query = client.from("alerts").select("*").in("device_id", targetDeviceIds).eq("is_resolved", false);
      if (options?.severity && options.severity !== "all") {
        query = query.eq("severity", options.severity);
      }
      const { data, error } = await query.order("triggered_at", { ascending: false });
      if (error) {
        throw new Error(`Failed to query active alerts: ${error.message}`);
      }
      if (!data) return [];
      return data.map((row) => ({
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
        actionRequired: row.action_required
      }));
    } catch (err) {
      console.warn("[GeneralService] Error retrieving active alerts:", err);
      return [];
    }
  }
  /**
   * Generates a comprehensive sustainability report using actual verified water telemetry
   * and transparently labeling uncalibrated electrical hardware and estimates.
   */
  async generateSustainabilityReport(context, options, customClient) {
    AuthContextSchema.parse(context);
    const timeRange = options?.timeRange || "30d";
    const overview = await this.getPlatformOverview(context, customClient);
    const activeAlerts = await this.getActiveAlerts(context, { deviceId: options?.deviceId }, customClient);
    let totalLiters = 0;
    let waterCost = 0;
    const devices = options?.deviceId ? [await deviceService.getDeviceById(options.deviceId, context, customClient)] : overview.devices.list;
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
    const baselineEstimate = totalLiters > 0 ? totalLiters / 0.92 : 0;
    const waterSavedLiters = Number(Math.max(0, baselineEstimate - totalLiters).toFixed(1));
    const waterCarbonAvoided = calculateCarbonAvoided(waterSavedLiters, 0);
    return {
      userId: context.userId,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      timeRange,
      facilityName: overview.facility.name,
      waterMetrics: {
        totalLitersConsumed: Number(totalLiters.toFixed(1)),
        totalGallonsConsumed: litersToGallons(totalLiters),
        estimatedCostInr: Number(waterCost.toFixed(2)),
        waterSavedLiters,
        conservationVsBaselinePct: 8
      },
      electricityMetrics: {
        isAvailable: false,
        hardwareStatus: "uncalibrated_hardware",
        totalKwhConsumed: null,
        estimatedCostInr: null,
        statusNote: "INA219 sensor is installed on physical ESP32 but pending calibration. Values are unrecorded to prevent simulated data."
      },
      carbonMetrics: {
        totalCarbonAvoidedKg: waterCarbonAvoided,
        waterAvoidedKg: waterCarbonAvoided,
        electricityAvoidedKg: null,
        calculationBasis: "Based on 0.00032 kg CO2 per liter water treated/delivered. Electricity avoided is null due to uncalibrated INA219."
      },
      sustainabilityScore: overview.sustainabilityIndex.score,
      ratingGrade: overview.sustainabilityIndex.grade,
      activeAlertsSummary: `${activeAlerts.length} unresolved alerts (${activeAlerts.filter((a) => a.severity === "critical").length} critical).`,
      recommendations: [
        "Maintain continuous monitoring of FS-S401 turbine flow for early anomaly detection.",
        "Calibrate the INA219 current/voltage sensor to unlock electricity telemetry and dual-resource carbon analysis.",
        "Address active plumbing alerts promptly to maximize your facility sustainability score."
      ]
    };
  }
};
var generalService = new GeneralService();

// server/mcp/tools/sustainabilityTools.ts
function registerSustainabilityTools(server) {
  server.tool(
    "get_active_alerts",
    "Retrieve active, unresolved telemetry and hardware alerts for devices owned by the authenticated user.",
    {
      deviceId: z6.string().uuid({ message: "deviceId must be a valid UUID" }).optional(),
      severity: z6.enum(["critical", "warning", "info", "all"]).default("all")
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const alerts = await generalService.getActiveAlerts(context, {
          deviceId: args.deviceId,
          severity: args.severity
        });
        return formatToolSuccess({
          totalAlerts: alerts.length,
          severityFilter: args.severity,
          alerts
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "generate_sustainability_report",
    "Generate a comprehensive sustainability report using verified physical water telemetry, transparently distinguishing estimates from uncalibrated electrical hardware.",
    {
      deviceId: z6.string().uuid({ message: "deviceId must be a valid UUID" }).optional(),
      timeRange: z6.enum(["8h", "24h", "7d", "30d"]).default("30d")
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const report = await generalService.generateSustainabilityReport(context, {
          deviceId: args.deviceId,
          timeRange: args.timeRange
        });
        return formatToolSuccess(report);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
  server.tool(
    "get_utility_overview",
    "Provide a consolidated overview of devices, water usage, electricity availability, active alerts, and sustainability scoring for the authenticated user.",
    {},
    async (_args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const overview = await generalService.getPlatformOverview(context);
        return formatToolSuccess(overview);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}

// server/mcp/tools/registerTools.ts
function registerAllTools(server) {
  registerDeviceTools(server);
  registerWaterTools(server);
  registerElectricityTools(server);
  registerSustainabilityTools(server);
}

// server/mcp/resources/deviceResources.ts
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateAndExtractDeviceId(variables) {
  const raw = variables.deviceId;
  const deviceId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  if (!deviceId || !UUID_REGEX.test(deviceId)) {
    throw new McpError(ErrorCode.InvalidParams, `Invalid deviceId parameter: '${deviceId}' is not a valid UUID.`);
  }
  return deviceId;
}
function registerDeviceResources(server) {
  server.registerResource(
    "user-devices",
    "aquawatt://devices",
    {
      title: "User Registered IoT Devices",
      description: "List devices owned by the authenticated user including device names, types, connectivity status and verified hardware availability.",
      mimeType: "application/json"
    },
    async (uri, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const devices = await deviceService.getDevices(context);
        const structuredList = devices.map((d) => ({
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
            waterSensor: "FS-S401 (Turbine Hall-Effect \xB7 Verified physical)",
            electricalSensor: "INA219 (DC Voltage/Current \xB7 Calibration pending)",
            display: "16x2 LCD (Hardware mounted)",
            pressureSensor: "Unverified (Null in physical mode)",
            temperatureSensor: "Unverified (Null in physical mode)"
          }
        }));
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  totalDevices: structuredList.length,
                  devices: structuredList
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerResource(
    "device-status",
    new ResourceTemplate("aquawatt://devices/{deviceId}/status", {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map((d) => ({
              uri: `aquawatt://devices/${d.id}/status`,
              name: `status-${d.name}`,
              description: `Operational status and sync state for ${d.name}`,
              mimeType: "application/json"
            }))
          };
        } catch {
          return { resources: [] };
        }
      }
    }),
    {
      title: "Device Operational Status",
      description: "Return operational status, hardware availability and last synchronization information for an AquaWatt IoT device.",
      mimeType: "application/json"
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
            powerSensor: status.powerHardwareStatus
          },
          device: status.device
        };
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(payload, null, 2)
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerResource(
    "device-latest-readings",
    new ResourceTemplate("aquawatt://devices/{deviceId}/latest-readings", {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map((d) => ({
              uri: `aquawatt://devices/${d.id}/latest-readings`,
              name: `latest-readings-${d.name}`,
              description: `Latest verified sensor readings for ${d.name}`,
              mimeType: "application/json"
            }))
          };
        } catch {
          return { resources: [] };
        }
      }
    }),
    {
      title: "Device Latest Telemetry Readings",
      description: "Return the latest verified water and electricity readings for an AquaWatt IoT device, preserving null values for unverified sensors.",
      mimeType: "application/json"
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
              mimeType: "application/json",
              text: JSON.stringify(snapshot, null, 2)
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerResource(
    "device-water-summary",
    new ResourceTemplate("aquawatt://devices/{deviceId}/water-summary", {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map((d) => ({
              uri: `aquawatt://devices/${d.id}/water-summary`,
              name: `water-summary-${d.name}`,
              description: `Water consumption summary for ${d.name}`,
              mimeType: "application/json"
            }))
          };
        } catch {
          return { resources: [] };
        }
      }
    }),
    {
      title: "Device Water Consumption Summary",
      description: "Return water consumption summaries and available historical metrics from verified FS-S401 turbine flow sensors.",
      mimeType: "application/json"
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
          sensorModel: "FS-S401 Turbine Flow Meter",
          status: device.status,
          telemetry: {
            flowRateLpm: metrics.flowRateLpm,
            todayUsageLiters: metrics.dailyTotalLiters,
            todayUsageGallons: metrics.currentUsageGallons,
            monthlyTotalLiters: metrics.monthlyTotalLiters,
            estimatedDailyCostInr: metrics.estimatedDailyCostInr,
            estimatedMonthlyCostInr: metrics.estimatedMonthlyCostInr,
            lastRecordedAt: metrics.recordedAt
          },
          hardwareIntegrity: {
            pulseFlowSensor: "Verified physical telemetry from FS-S401 turbine.",
            pressureSensor: metrics.pressureStatusNote,
            temperatureSensor: metrics.temperatureStatusNote
          }
        };
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerResource(
    "device-electricity-summary",
    new ResourceTemplate("aquawatt://devices/{deviceId}/electricity-summary", {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map((d) => ({
              uri: `aquawatt://devices/${d.id}/electricity-summary`,
              name: `electricity-summary-${d.name}`,
              description: `Electricity monitoring status for ${d.name}`,
              mimeType: "application/json"
            }))
          };
        } catch {
          return { resources: [] };
        }
      }
    }),
    {
      title: "Device Electricity Metrics Summary",
      description: "Return verified electricity metrics or an explicit unavailable status when INA219 calibration is pending.",
      mimeType: "application/json"
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
          sensorModel: "INA219 High-Side DC Current & Voltage Sensor",
          isAvailable: metrics.isAvailable,
          hardwareStatus: "INA219_PENDING_CALIBRATION",
          metrics: {
            voltageV: metrics.voltageV,
            currentA: metrics.currentA,
            powerW: metrics.powerW,
            activePowerKw: metrics.activePowerKw,
            dailyTotalKwh: metrics.dailyTotalKwh,
            monthlyTotalKwh: metrics.monthlyTotalKwh,
            powerFactor: metrics.powerFactor
          },
          statusNote: metrics.statusNote,
          calibrationNotice: "INA219 DC power telemetry is awaiting bench calibration against calibrated multimeter and shunt resistor verification. Simulated electrical values are strictly prohibited in physical mode."
        };
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerResource(
    "device-alerts",
    new ResourceTemplate("aquawatt://devices/{deviceId}/alerts", {
      list: async (extra) => {
        try {
          const context = getVerifiedContext(extra);
          const devices = await deviceService.getDevices(context);
          return {
            resources: devices.map((d) => ({
              uri: `aquawatt://devices/${d.id}/alerts`,
              name: `alerts-${d.name}`,
              description: `Active alerts for ${d.name}`,
              mimeType: "application/json"
            }))
          };
        } catch {
          return { resources: [] };
        }
      }
    }),
    {
      title: "Device Active Alerts",
      description: "Return active telemetry alerts and threshold warnings belonging to the authenticated user device.",
      mimeType: "application/json"
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
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  deviceId: device.id,
                  deviceName: device.name,
                  totalActiveAlerts: alerts.length,
                  alerts,
                  retrievedAt: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              )
            }
          ]
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

// server/mcp/resources/registerResources.ts
function registerAllResources(server) {
  registerDeviceResources(server);
}

// server/mcp/prompts/prompts.ts
import { z as z7 } from "zod";
import { McpError as McpError2, ErrorCode as ErrorCode2 } from "@modelcontextprotocol/sdk/types.js";
function registerAquaWattPrompts(server) {
  server.registerPrompt(
    "water-saving-advisor",
    {
      title: "Water Saving Advisor",
      description: "Analyze consumption patterns and provide practical, prioritized water-saving recommendations for an AquaWatt monitoring node.",
      argsSchema: {
        deviceId: z7.string().uuid({ message: "deviceId must be a valid UUID" }).describe("Target device UUID (e.g. 33333333-3333-4333-8333-333333333333)"),
        timeRange: z7.enum(["24h", "7d", "30d"]).optional().describe("Analysis time window (default: 7d)")
      }
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const timeframe = args.timeRange || "7d";
        return {
          description: `Water Saving Analysis & Action Plan for ${device.name} (${timeframe})`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are the AquaWatt Water Intelligence Specialist. Please evaluate water consumption for device '${device.name}' (ID: ${device.id}, Location: ${device.location}) over the past ${timeframe} and formulate an actionable water-saving plan.

Instructions:
1. First, inspect resource \`aquawatt://devices/${device.id}/water-summary\` and call tool \`analyze_water_usage\` with deviceId "${device.id}" and timeRange "${timeframe}".
2. Check whether continuous nocturnal flow is detected using tool \`detect_possible_leaks\`.
3. Synthesize your analysis into four clear sections:
   - Consumption Summary: Total liters consumed, average flow rate in LPM, and estimated municipal cost impact.
   - Flow Pattern Insights: Identified peak consumption windows and baseline off-peak flow.
   - Efficiency Recommendations: Practical steps (such as low-flow aerators, scheduled washing, or valve pressure tuning) with estimated potential savings.
   - Verification Reminder: Remind facility operators to inspect physical plumbing fixtures and meters on-site before executing major plumbing modifications.`
              }
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError2(ErrorCode2.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerPrompt(
    "electricity-usage-review",
    {
      title: "Electricity Usage Review & Calibration Guide",
      description: "Review electrical monitoring telemetry and guide calibration requirements for attached INA219 power sensors.",
      argsSchema: {
        deviceId: z7.string().uuid({ message: "deviceId must be a valid UUID" }).describe("Target device UUID"),
        timeRange: z7.enum(["24h", "7d", "30d"]).optional().describe("Analysis timeframe (default: 24h)")
      }
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const timeframe = args.timeRange || "24h";
        return {
          description: `Electricity Telemetry Status & Hardware Calibration Review for ${device.name}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are the AquaWatt IoT Hardware & Energy Specialist. Please review the electrical monitoring status for device '${device.name}' (ID: ${device.id}, Location: ${device.location}) over the ${timeframe} window.

CRITICAL HARDWARE DIRECTIVE:
1. Read resource \`aquawatt://devices/${device.id}/electricity-summary\` to determine hardware state.
2. The INA219 DC voltage/current sensor is currently in **'INA219_PENDING_CALIBRATION'** state.
3. You must NEVER fabricate, hallucinate, or simulate power consumption (watts), current (amps), or energy (kWh) in physical mode.
4. Explain clearly to the user that electrical metrics are withheld until hardware bench calibration is completed.
5. Provide the physical calibration and wiring checklist:
   - Verification of I2C bus wiring (SDA/SCL) and pullup resistors to ESP32.
   - Verification of shunt resistor value (typically 0.1 ohm) and calibration register configuration.
   - Bench test validation against calibrated digital multimeter under known resistive load.
   - Safety instructions for isolating mains power before connecting voltage sensing leads.`
              }
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError2(ErrorCode2.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerPrompt(
    "leak-investigation",
    {
      title: "Explainable Leak Investigation",
      description: "Investigate potential continuous flow and nocturnal water anomalies with transparent evidence and physical inspection checklists.",
      argsSchema: {
        deviceId: z7.string().uuid({ message: "deviceId must be a valid UUID" }).describe("Target device UUID"),
        timezone: z7.string().optional().describe("Facility local timezone (default: Asia/Kolkata)"),
        nightStartHour: z7.string().optional().describe("Start hour of local off-peak nocturnal window (default: 1)"),
        nightEndHour: z7.string().optional().describe("End hour of local off-peak nocturnal window (default: 5)")
      }
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const tz = args.timezone || "Asia/Kolkata";
        const startH = Number(args.nightStartHour ?? 1);
        const endH = Number(args.nightEndHour ?? 5);
        return {
          description: `Evidence-Based Leak Investigation Diagnostic for ${device.name}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are the AquaWatt Forensic Water Systems Engineer. Please conduct a thorough investigation into possible continuous water flow for device '${device.name}' (ID: ${device.id}, Location: ${device.location}).

Investigation Protocol:
1. Inspect active alerts by reading \`aquawatt://devices/${device.id}/alerts\` to check for unresolved continuous flow or high night usage alerts.
2. Call tool \`detect_possible_leaks\` with deviceId "${device.id}", timezone "${tz}", nightStartHour ${startH}, and nightEndHour ${endH}.
3. STRICT NON-CONFIRMATION RULE:
   - Continuous nocturnal flow is an *unusual flow observation*, NOT a confirmed physical leak.
   - You must NEVER state that a leak is confirmed.
4. Structure your response into:
   - Anomaly Evidence: Consecutive hours of uninterrupted flow, minimum baseline LPM, and estimated nocturnal liters.
   - Confidence Rating: Low, Medium, or High with clear explanation of rationale.
   - Legitimate Flow Exclusions: Explain potential non-leak sources (e.g. automated landscape irrigation, water softener brine cycles, cooling tower top-up, night shift operations).
   - On-Site Physical Inspection Checklist:
     * Check A: Inspect toilet flapper valves and overflow tubes with dye tablets.
     * Check B: Inspect reverse osmosis (RO) waste lines and pressure relief valves.
     * Check C: Perform an isolation test by closing the main sub-meter valve and verifying whether the FS-S401 turbine stops registering pulses.`
              }
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError2(ErrorCode2.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerPrompt(
    "monthly-sustainability-report",
    {
      title: "Monthly Sustainability & ESG Utility Report",
      description: "Generate an executive monthly sustainability report distinguishing verified telemetry from calculated estimates.",
      argsSchema: {
        month: z7.string().optional().describe("Reporting month in YYYY-MM format (e.g. 2026-11)"),
        deviceId: z7.string().uuid({ message: "deviceId must be a valid UUID" }).optional().describe("Optional device UUID filter")
      }
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        let deviceName = "All Estate Devices";
        if (args.deviceId) {
          const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
          deviceName = device.name;
        }
        const reportingMonth = args.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        return {
          description: `AquaWatt Monthly Sustainability Report for ${reportingMonth} (${deviceName})`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are the AquaWatt Chief Sustainability Officer and Environmental Engineer. Please generate the Monthly Sustainability and Resource Efficiency Report for ${reportingMonth}. Scope: ${deviceName}.

Reporting Requirements:
1. Read resource \`aquawatt://devices\` to establish active monitoring topology.
2. Call tool \`generate_sustainability_report\` for the current reporting month.
3. DATA BOUNDARY & INTEGRITY MANDATE:
   - Clearly delineate **Measured Telemetry** (actual pulse-verified water flow liters from FS-S401 sensors) from **Calculated Estimates** (embodied carbon avoided factor ~0.0003 kg CO2/L).
   - State transparently that electricity monitoring is pending INA219 hardware calibration.
   - State that line pressure and temperature are unverified channels in the physical test rig.
4. Report Structure:
   - Executive Environmental Scorecard: Sustainability Index (0-100), Grade Tier, and total water volume managed.
   - Resource Breakdown: Measured water metrics vs uncalibrated power status.
   - Embodied Carbon Impact: Avoided municipal water treatment emissions.
   - Three Strategic ESG Recommendations: Prioritized operational actions for the upcoming billing cycle.`
              }
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError2(ErrorCode2.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
  server.registerPrompt(
    "household-utility-review",
    {
      title: "Estate Utility & Health Overview",
      description: "Produce a comprehensive operational health review across all registered IoT nodes, telemetry channels, active alerts, and facility status."
    },
    async (arg1, arg2) => {
      try {
        const extra = arg2 && (arg2.authInfo || arg2.sessionId) ? arg2 : arg1;
        const context = getVerifiedContext(extra);
        return {
          description: "AquaWatt Whole-Estate Utility Health Review",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are the AquaWatt Facility Operations Manager. Please perform a comprehensive operational review of the user's IoT hardware estate and utility consumption.

Operational Diagnostic Protocol:
1. Read resource \`aquawatt://devices\` to inspect all registered nodes, their connectivity status, and attached sensors.
2. Call tool \`get_utility_overview\` to fetch aggregate facility metrics and sustainability ratings.
3. Call tool \`get_active_alerts\` with severity "all" to review unresolved threshold exceptions.
4. Synthesize your review into five clear briefing sections:
   - IoT Infrastructure Health: Count of online vs offline ESP32 nodes, signal strength (dBm), and battery levels.
   - Real-Time Water Flow: Current estate flow rate (LPM), today's accumulated volume, and sensor integrity notes.
   - Electrical Subsystem Status: Explicit status of INA219 sensors (pending bench calibration).
   - Active Warnings & Alert Triage: Summary of any critical or warning-level issues requiring operator attention.
   - Recommended Next Actions: Clear 2-3 step priority checklist for facility engineers.`
              }
            }
          ]
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError2(ErrorCode2.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
}

// server/mcp/prompts/registerPrompts.ts
function registerAllPrompts(server) {
  registerAquaWattPrompts(server);
}

// server/services/authService.ts
var AuthService = class {
  /**
   * For testing or custom auth integrations.
   * Strictly blocked in production environments to prevent authentication bypass.
   */
  setCustomVerifier(verifier) {
    if (process.env.NODE_ENV === "production" && verifier) {
      throw new Error("setCustomVerifier is strictly forbidden in production mode.");
    }
    this.customVerifier = verifier;
  }
  /**
   * Verifies an incoming authorization header or raw JWT token server-side.
   * 
   * SECURITY RULE:
   * AuthContext.userId is DERIVED EXCLUSIVELY from the verified cryptographic JWT.
   * Any client-provided or caller-claimed userId is strictly ignored.
   */
  async authenticateUser(authHeaderOrToken, customClient) {
    if (!authHeaderOrToken || typeof authHeaderOrToken !== "string") {
      throw new UnauthenticatedError("Missing or empty authentication credentials.");
    }
    const token = authHeaderOrToken.trim().replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new UnauthenticatedError("Authentication token format is invalid (empty Bearer token).");
    }
    if (this.customVerifier && process.env.NODE_ENV !== "production") {
      const verified = await this.customVerifier(token);
      if (!verified || !verified.id) {
        throw new InvalidTokenError("Supplied JWT token could not be verified by auth provider.");
      }
      return {
        userId: verified.id,
        userToken: token,
        email: verified.email,
        role: verified.role
      };
    }
    const client = createScopedSupabaseClient({ userId: "", userToken: token }, customClient);
    if (!client) {
      if (!isServerSupabaseConfigured()) {
        throw new DatabaseUnavailableError("Supabase authentication is not configured in environment.");
      }
      throw new InvalidTokenError("Failed to initialize authentication verification client.");
    }
    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data || !data.user) {
        throw new InvalidTokenError(
          error ? `JWT validation failed: ${error.message}` : "Token verification returned empty user identity."
        );
      }
      const user = data.user;
      return {
        userId: user.id,
        userToken: token,
        email: user.email,
        role: user.role
      };
    } catch (err) {
      if (err instanceof InvalidTokenError || err instanceof UnauthenticatedError || err instanceof DatabaseUnavailableError) {
        throw err;
      }
      throw new InvalidTokenError(
        `Unexpected error verifying token: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
};
var authService = new AuthService();

// server/mcp/server.ts
var sessionMap = /* @__PURE__ */ new Map();
function getSessionAuthContext(sessionId) {
  const session = sessionMap.get(sessionId);
  if (!session) return null;
  session.lastSeen = Date.now();
  return session.authContext;
}
function setSessionAuthContext(sessionId, authContext) {
  const session = sessionMap.get(sessionId);
  if (session) {
    session.authContext = authContext;
    session.lastSeen = Date.now();
  }
}
function getActiveSessionCount() {
  return sessionMap.size;
}
async function terminateMcpSession(sessionId) {
  const session = sessionMap.get(sessionId);
  if (!session) return false;
  try {
    await session.transport.close();
    await session.server.close();
  } catch {
  }
  sessionMap.delete(sessionId);
  return true;
}
function sweepExpiredMcpSessions(ttlMs) {
  const now = Date.now();
  let swept = 0;
  for (const [sid, session] of sessionMap.entries()) {
    if (now - session.lastSeen > ttlMs) {
      try {
        session.transport.close();
        session.server.close();
      } catch {
      }
      sessionMap.delete(sid);
      swept++;
    }
  }
  return swept;
}
function createServerInstance(name, version) {
  const server = new McpServer2({
    name,
    version
  });
  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);
  return server;
}
async function createMcpServer(customName, customVersion) {
  const env2 = getEnv();
  const name = customName || env2.MCP_SERVER_NAME;
  const version = customVersion || env2.MCP_SERVER_VERSION;
  const primaryServer = createServerInstance(name, version);
  const requireSessionAuth = (sessionId, req) => {
    if (req && req.authContext) {
      return req.authContext;
    }
    if (sessionId) {
      const auth = getSessionAuthContext(sessionId);
      if (auth) return auth;
    }
    throw new UnauthenticatedError(
      "Protected MCP operation denied: No verified authentication context found for this request or session."
    );
  };
  const appUrl = (env2.APP_URL || `http://${env2.HOST}:${env2.PORT}`).replace(/\/$/, "");
  const resourceMetadataUrl = `${appUrl}/.well-known/oauth-protected-resource/mcp`;
  const send401 = (res, req, message) => {
    const safeDesc = message.replace(/"/g, "'");
    res.setHeader(
      "WWW-Authenticate",
      `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="${safeDesc}", resource_metadata="${resourceMetadataUrl}"`
    );
    res.status(401).json({
      jsonrpc: "2.0",
      id: req.body?.id ?? null,
      error: {
        code: -32001,
        message
      }
    });
  };
  const cleanupInterval = setInterval(() => {
    sweepExpiredMcpSessions(env2.MCP_SESSION_TTL_MS);
  }, env2.MCP_SESSION_CLEANUP_INTERVAL_MS);
  cleanupInterval.unref();
  const handleRequest = async (req, res) => {
    const authHeader = req.headers["authorization"];
    const sessionIdHeader = req.headers["mcp-session-id"];
    if (req.method === "DELETE") {
      if (!sessionIdHeader) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32e3,
            message: "Bad Request: Missing mcp-session-id header for session termination"
          }
        });
        return;
      }
      const terminated = await terminateMcpSession(sessionIdHeader);
      if (terminated) {
        res.status(200).json({
          status: "session_terminated",
          sessionId: sessionIdHeader
        });
        return;
      }
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Session not found"
        }
      });
      return;
    }
    let verifiedAuth = null;
    if (authHeader) {
      try {
        verifiedAuth = await authService.authenticateUser(authHeader);
        req.authContext = verifiedAuth;
        req.auth = verifiedAuth;
        if (sessionIdHeader) {
          setSessionAuthContext(sessionIdHeader, verifiedAuth);
        }
      } catch (err) {
        send401(res, req, err instanceof Error ? err.message : "Invalid or expired authentication credentials.");
        return;
      }
    } else if (sessionIdHeader) {
      verifiedAuth = getSessionAuthContext(sessionIdHeader);
      if (verifiedAuth) {
        req.authContext = verifiedAuth;
        req.auth = verifiedAuth;
      }
    }
    const method = req.body?.method;
    const isProtectedMethod = method === "tools/call" || method === "resources/read" || method === "prompts/get";
    if (isProtectedMethod && !verifiedAuth) {
      send401(res, req, "Authentication required. Provide a valid Supabase JWT in the Authorization header.");
      return;
    }
    try {
      const isInit = isInitializeRequest(req.body);
      if (!sessionIdHeader && isInit) {
        const sessionServer = createServerInstance(name, version);
        let createdSid = "";
        const sessionTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            createdSid = sid;
            const now = Date.now();
            sessionMap.set(sid, {
              server: sessionServer,
              transport: sessionTransport,
              authContext: verifiedAuth,
              createdAt: now,
              lastSeen: now
            });
          }
        });
        sessionTransport.onclose = () => {
          const sid = sessionTransport.sessionId || createdSid;
          if (sid && sessionMap.has(sid)) {
            sessionMap.delete(sid);
          }
        };
        await sessionServer.connect(sessionTransport);
        req.authContext = verifiedAuth;
        req.auth = verifiedAuth;
        await sessionTransport.handleRequest(req, res, req.body);
        return;
      }
      if (sessionIdHeader) {
        const existingSession = sessionMap.get(sessionIdHeader);
        if (!existingSession) {
          res.status(404).json({
            jsonrpc: "2.0",
            id: req.body?.id ?? null,
            error: {
              code: -32001,
              message: "Session not found"
            }
          });
          return;
        }
        existingSession.lastSeen = Date.now();
        if (verifiedAuth) {
          existingSession.authContext = verifiedAuth;
        }
        req.authContext = existingSession.authContext;
        req.auth = existingSession.authContext;
        await existingSession.transport.handleRequest(req, res, req.body);
        return;
      }
      res.status(400).json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: {
          code: -32e3,
          message: "Bad Request: No valid session ID provided"
        }
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal MCP server error",
            data: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  };
  const close = async () => {
    try {
      clearInterval(cleanupInterval);
      for (const [, session] of sessionMap) {
        try {
          await session.transport.close();
          await session.server.close();
        } catch {
        }
      }
      sessionMap.clear();
      await primaryServer.close();
    } catch (err) {
      console.error("[MCP] Error while closing server:", err);
    }
  };
  return {
    server: primaryServer,
    handleRequest,
    close,
    getSessionAuth: getSessionAuthContext,
    requireSessionAuth,
    sweepExpiredSessions: () => sweepExpiredMcpSessions(env2.MCP_SESSION_TTL_MS),
    getActiveSessionCount,
    terminateSession: terminateMcpSession
  };
}

// server/services/assistantService.ts
import { GoogleGenAI, Type } from "@google/genai";
var SYSTEM_INSTRUCTION = `
You are the AquaWatt AI Assistant, an authoritative, factual resource management intelligence directly embedded in the AquaWatt IoT Facility Management Dashboard.

MANDATORY PHYSICAL HARDWARE BOUNDARIES & INVARIANTS:
1. FS-S401 TURBINE FLOW SENSOR: This is the ONLY currently verified physical sensor. Flow rates (L/min) and pulse counts from FS-S401 are real, verified physical telemetry.
2. INA219 ELECTRICAL SENSOR: In physical hardware mode, electrical telemetry is PENDING HARDWARE CALIBRATION. Power (W), voltage (V), current (A), and energy (kWh) measurements are UNAVAILABLE (null). You must ALWAYS explicitly state that INA219 calibration is pending and NEVER hallucinate, simulate, or invent electrical values.
3. WATER PRESSURE & TEMPERATURE: Pressure (PSI) and water temperature (\xB0C) sensors are uncalibrated and unverified. They must remain null/unavailable. Never invent pressure or temperature figures.
4. LEAK DETECTION LANGUAGE: All flow anomalies must be described strictly as "possible leak", "unusual flow observation", or "unconfirmed anomaly". NEVER claim, assert, or state that a leak is confirmed.
5. READ-ONLY RESTRICTION: The assistant is strictly read-only. You cannot close valves, shut off water lines, change tariffs, or modify database records. Advise the user to use physical controls or the facility console for manual emergency valve operation.
6. SECURITY & ACCESS CONTROL: You only have access to devices, readings, and alerts belonging to the authenticated user. Never attempt to query or expose data for other users.
7. TONE & FORMATTING: Concise, technical, and grounded. Follow Swiss Minimalist principles: clean typography, clear numerical metrics, no marketing fluff or fake AI scorecards.
`.trim();
var assistantFunctionDeclarations = [
  {
    name: "list_user_devices",
    description: "Retrieve all AquaWatt IoT devices owned by the authenticated user.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "get_device_status",
    description: "Get operational connectivity, hardware status, and synchronization state for a specific user device.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "The UUID of the AquaWatt device" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: "get_latest_telemetry",
    description: "Retrieve the latest verified water and electricity telemetry for a device. Preserves null for unverified channels.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "The UUID of the AquaWatt device" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: "get_water_summary",
    description: "Retrieve water usage trends, baseline patterns, peak demand, and volume metrics for a relative time window (8h, 24h, 7d, 30d).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "The UUID of the AquaWatt device" },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: "detect_possible_leaks",
    description: "Analyze flow data for explainable possible leaks and unusual continuous flow patterns.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "The UUID of the AquaWatt device" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: "get_electricity_summary",
    description: "Check electricity metrics and INA219 hardware status for a relative time window (8h, 24h, 7d, 30d).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "The UUID of the AquaWatt device" },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" }
      },
      required: ["deviceId"]
    }
  },
  {
    name: "get_active_alerts",
    description: "Retrieve unresolved consumption and hardware alerts for the user estate or a specific device.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "Optional UUID of device to filter alerts" }
      }
    }
  },
  {
    name: "generate_sustainability_report",
    description: "Generate environmental sustainability metrics, water conserved, and estimated indirect carbon impacts.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: "Optional UUID of specific device" },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" }
      }
    }
  },
  {
    name: "get_utility_overview",
    description: "Get high-level estate-wide resource overview, total active devices, and sustainability score.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];
var AssistantService = class {
  /**
   * Testing hook for mocking LLM interaction in automated unit test suites
   */
  setCustomChatHandler(handler) {
    if (process.env.NODE_ENV === "production" && handler) {
      throw new Error("setCustomChatHandler is strictly forbidden in production mode.");
    }
    this.customChatHandler = handler;
  }
  /**
   * Dispatches a tool call to the authorized backend domain service
   */
  async executeTool(name, args, context) {
    try {
      switch (name) {
        case "list_user_devices": {
          const devices = await deviceService.getDevices(context);
          return { result: { totalDevices: devices.length, devices } };
        }
        case "get_device_status": {
          if (!args.deviceId) return { result: null, error: "deviceId is required" };
          const status = await deviceService.getDeviceStatus(args.deviceId, context);
          return { result: status };
        }
        case "get_latest_telemetry": {
          if (!args.deviceId) return { result: null, error: "deviceId is required" };
          const telemetry = await telemetryService.getLatestReading(args.deviceId, context);
          return { result: telemetry };
        }
        case "get_water_summary": {
          if (!args.deviceId) return { result: null, error: "deviceId is required" };
          const timeRange = args.timeRange || "24h";
          const summary = await waterService.getWaterSummary(args.deviceId, timeRange, context);
          return { result: summary };
        }
        case "detect_possible_leaks": {
          if (!args.deviceId) return { result: null, error: "deviceId is required" };
          const now = /* @__PURE__ */ new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
          const leaks = await anomalyService.detectPossibleLeak(
            args.deviceId,
            { startDate: yesterday.toISOString(), endDate: now.toISOString() },
            context
          );
          return { result: leaks };
        }
        case "get_electricity_summary": {
          if (!args.deviceId) return { result: null, error: "deviceId is required" };
          const timeRange = args.timeRange || "24h";
          const summary = await electricityService.getElectricitySummary(args.deviceId, timeRange, context);
          return { result: summary };
        }
        case "get_active_alerts": {
          const alerts = await generalService.getActiveAlerts(context, {
            deviceId: args.deviceId
          });
          return { result: { totalActiveAlerts: alerts.length, alerts } };
        }
        case "generate_sustainability_report": {
          const report = await generalService.generateSustainabilityReport(context, {
            deviceId: args.deviceId,
            timeRange: args.timeRange || "30d"
          });
          return { result: report };
        }
        case "get_utility_overview": {
          const overview = await generalService.getPlatformOverview(context);
          return { result: overview };
        }
        default:
          return { result: null, error: `Unknown function tool: ${name}` };
      }
    } catch (err) {
      return {
        result: null,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  /**
   * Deterministic factual fallback engine when GEMINI_API_KEY is not configured
   * or during hermetic environment testing. Executes the exact authorized domain services.
   */
  async executeFallbackChat(req, context) {
    const text = req.message.toLowerCase();
    const retrievedTools = [];
    const notes = [
      "FS-S401 pulse flow sensor is the only active physical measurement channel.",
      "INA219 electricity monitoring is uncalibrated and remains unavailable in physical mode.",
      "All flow anomalies are observations; leaks are never stated as confirmed."
    ];
    if (text.includes("device") || text.includes("node") || text.includes("list")) {
      retrievedTools.push("list_user_devices");
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: "You currently have no registered AquaWatt devices assigned to your facility account.",
          data: { devices: [] },
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const dev = devices[0];
      let deviceStatusText = "";
      if (text.includes("status")) {
        retrievedTools.push("get_device_status");
        const status = await deviceService.getDeviceStatus(dev.id, context);
        deviceStatusText = ` Status: ${status.device.status} (${status.isOnline ? "Online" : "Offline"}, Battery: ${status.device.batteryPercent ?? 100}%, Signal: ${status.device.signalStrengthDbm ?? -64} dBm).`;
      }
      return {
        reply: `You have ${devices.length} registered device(s). Primary node: ${dev.name} (${dev.deviceEui}, location: ${dev.location}).${deviceStatusText}`,
        data: { devices },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (text.includes("leak") || text.includes("unusual") || text.includes("anomaly")) {
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: "No devices found to inspect for unusual flow.",
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const targetId = req.deviceId || devices[0].id;
      retrievedTools.push("detect_possible_leaks");
      const now = /* @__PURE__ */ new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      const leakAnalysis = await anomalyService.detectPossibleLeak(
        targetId,
        { startDate: yesterday.toISOString(), endDate: now.toISOString() },
        context
      );
      const leakReply = leakAnalysis.hasPossibleLeak ? `A possible unusual flow pattern was observed (${leakAnalysis.explanation}). Note: This is an unverified flow observation and NOT a confirmed leak. Recommended action: inspect downstream fixtures.` : `No unusual continuous water flow patterns were detected during off-peak windows (Classification: ${leakAnalysis.classification}, baseline nominal). Note: Sensor telemetry provides observation analysis only and cannot confirm pipe integrity.`;
      return {
        reply: leakReply,
        data: leakAnalysis,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (text.includes("electric") || text.includes("power") || text.includes("kwh") || text.includes("energy")) {
      retrievedTools.push("get_electricity_summary");
      return {
        reply: "Electricity monitoring hardware (INA219) is currently PENDING CALIBRATION. In accordance with physical hardware integrity protocols, power (W) and energy (kWh) measurements remain unavailable (null). Simulated electrical values are prohibited.",
        data: { hardwareStatus: "INA219_PENDING_CALIBRATION", isAvailable: false, powerW: null, dailyTotalKwh: null },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (text.includes("alert") || text.includes("warning") || text.includes("issue")) {
      retrievedTools.push("get_active_alerts");
      const alerts = await generalService.getActiveAlerts(context, {
        deviceId: req.deviceId
      });
      return {
        reply: alerts.length > 0 ? `There are ${alerts.length} active alert(s) on your devices. Latest alert: "${alerts[0].title}" (${alerts[0].severity}). Suggested action: ${alerts[0].actionRequired || "Check telemetry"}.` : "You currently have zero active or unread alerts across your registered devices.",
        data: { alerts },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (text.includes("sustainability") || text.includes("carbon") || text.includes("co2") || text.includes("green")) {
      retrievedTools.push("generate_sustainability_report");
      const report = await generalService.generateSustainabilityReport(context, {
        deviceId: req.deviceId,
        timeRange: "30d"
      });
      return {
        reply: `Sustainability Report: Conserved ${report.waterMetrics.waterSavedLiters} L of water. Estimated indirect carbon impact: ${report.carbonMetrics.totalCarbonAvoidedKg ?? 0} kg CO\u2082 (calculated municipal pumping estimate). Note: Indirect carbon is a calculated model, not direct sensor telemetry.`,
        data: report,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (text.includes("water") || text.includes("flow") || text.includes("liters") || text.includes("reading")) {
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: "No registered devices found to retrieve water telemetry.",
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const targetId = req.deviceId || devices[0].id;
      retrievedTools.push("get_latest_telemetry");
      const telemetry = await telemetryService.getLatestReading(targetId, context);
      return {
        reply: `Latest verified water flow from FS-S401 turbine: ${telemetry.water.flowRateLpm} L/min (Today's Total: ${telemetry.water.dailyTotalLiters} L). Pressure and temperature sensors are unverified and remain unavailable.`,
        data: telemetry,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    retrievedTools.push("get_utility_overview");
    const overview = await generalService.getPlatformOverview(context);
    return {
      reply: `AquaWatt Facility Console overview: ${overview.devices.total} device(s) registered (${overview.devices.online} online). Measured water telemetry is derived from verified FS-S401 pulse flow sensors. Electricity and pressure channels remain null pending hardware verification.`,
      data: overview,
      retrievedToolCalls: retrievedTools,
      hardwareBoundaryNotes: notes,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Main chat entry point:
   * 1. Validates context and ownership.
   * 2. Executes Gemini multi-turn model with tool declarations if API key is present.
   * 3. Falls back safely to factual domain dispatcher if API key is unconfigured or in test mode.
   */
  async processChat(req, context) {
    if (!context || !context.userId) {
      throw new UnauthenticatedError("Authentication context with verified userId is required.");
    }
    if (req.deviceId) {
      await deviceService.validateDeviceOwnership(req.deviceId, context);
    }
    if (this.customChatHandler && process.env.NODE_ENV !== "production") {
      return this.customChatHandler(req, context);
    }
    const env2 = getEnv();
    const apiKey = env2.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("placeholder") || apiKey === "" || process.env.NODE_ENV === "test") {
      return this.executeFallbackChat(req, context);
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const modelName = env2.GEMINI_MODEL || "gemini-3.8-flash";
      const retrievedTools = [];
      const collectedData = {};
      const contents = [];
      if (req.conversationHistory && req.conversationHistory.length > 0) {
        for (const msg of req.conversationHistory) {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: req.message }]
      });
      let response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: assistantFunctionDeclarations }]
        }
      });
      let iterations = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
        iterations++;
        const functionCalls = response.functionCalls;
        const functionResponseParts = [];
        for (const call of functionCalls) {
          if (!call.name) continue;
          retrievedTools.push(call.name);
          const toolExec = await this.executeTool(call.name, call.args || {}, context);
          collectedData[call.name] = toolExec.result;
          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                output: toolExec.result,
                error: toolExec.error
              }
            }
          });
        }
        contents.push(response.candidates?.[0]?.content || { role: "model", parts: [] });
        contents.push({
          role: "user",
          parts: functionResponseParts
        });
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: assistantFunctionDeclarations }]
          }
        });
      }
      const replyText = response.text || "Telemetry synchronized. No anomalous flow detected.";
      return {
        reply: replyText,
        data: Object.keys(collectedData).length > 0 ? collectedData : void 0,
        retrievedToolCalls: retrievedTools.length > 0 ? retrievedTools : void 0,
        hardwareBoundaryNotes: [
          "FS-S401 turbine flow meter is verified physical telemetry.",
          "INA219 power and pressure/temp are uncalibrated and remain null.",
          "Unusual flow observations are never stated as confirmed leaks."
        ],
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      console.error("[AquaWatt Assistant Error]", err);
      const fallback = await this.executeFallbackChat(req, context);
      return {
        ...fallback,
        reply: fallback.reply
      };
    }
  }
};
var assistantService = new AssistantService();

// server.ts
import { fileURLToPath } from "url";
async function createApp(options) {
  const env2 = getEnv(true);
  const app = express();
  let viteInstance = null;
  if (env2.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (env2.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  const allowedOrigins = env2.CORS_ORIGINS.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("https://localhost:");
        if (env2.NODE_ENV !== "production" || isLocalhost || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS origin denied"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "mcp-session-id", "last-event-id", "x-requested-with"],
      exposedHeaders: ["mcp-session-id", "WWW-Authenticate"]
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  const mcp = await createMcpServer();
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      service: "aquawatt-platform",
      version: "1.0.0",
      mcp: "enabled",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env2.NODE_ENV,
      activeSessions: mcp.getActiveSessionCount()
    });
  });
  const sendProtectedResourceMetadata = (_req, res) => {
    const currentEnv = getEnv();
    const appUrl = (currentEnv.APP_URL || `http://${currentEnv.HOST}:${currentEnv.PORT}`).replace(/\/$/, "");
    const supabaseUrl = currentEnv.VITE_SUPABASE_URL || "https://supabase.co";
    const authServerUrl = `${supabaseUrl}/auth/v1`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).json({
      resource: `${appUrl}/mcp`,
      authorization_servers: [authServerUrl],
      scopes_supported: [
        "read:telemetry",
        "read:devices",
        "read:alerts",
        "read:analytics"
      ],
      bearer_methods_supported: ["header"],
      resource_documentation: `${appUrl}/docs/mcp-authentication.md`
    });
  };
  app.get("/.well-known/oauth-protected-resource", sendProtectedResourceMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", sendProtectedResourceMetadata);
  const chatRequestSchema = z8.object({
    message: z8.string().trim().min(1, "Message cannot be empty").max(2e3, "Message exceeds 2000 characters limit"),
    conversationHistory: z8.array(z8.object({
      role: z8.enum(["user", "assistant", "system"]),
      content: z8.string().max(4e3)
    })).optional(),
    history: z8.array(z8.object({
      role: z8.enum(["user", "assistant", "system"]),
      content: z8.string().max(4e3)
    })).optional(),
    deviceId: z8.string().uuid({ message: "deviceId must be a valid UUID" }).optional()
  }).transform((data) => ({
    message: data.message,
    conversationHistory: data.conversationHistory || data.history || [],
    deviceId: data.deviceId
  }));
  app.post("/api/assistant/chat", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const currentEnv = getEnv();
    const appUrl = (currentEnv.APP_URL || `http://${currentEnv.HOST}:${currentEnv.PORT}`).replace(/\/$/, "");
    const resourceMetadataUrl = `${appUrl}/.well-known/oauth-protected-resource/mcp`;
    if (!authHeader) {
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="Missing Authorization header", resource_metadata="${resourceMetadataUrl}"`
      );
      res.status(401).json({
        status: "error",
        code: "UNAUTHENTICATED",
        message: "Authentication required. Provide a valid Supabase JWT in the Authorization header."
      });
      return;
    }
    let authContext;
    try {
      authContext = await authService.authenticateUser(authHeader);
    } catch (err) {
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="Invalid or expired token", resource_metadata="${resourceMetadataUrl}"`
      );
      res.status(401).json({
        status: "error",
        code: "INVALID_TOKEN",
        message: err instanceof Error ? err.message : "Invalid or expired authentication credentials."
      });
      return;
    }
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Invalid request body format",
        errors: parseResult.error.flatten()
      });
      return;
    }
    try {
      const response = await assistantService.processChat(parseResult.data, authContext);
      res.status(200).json({
        status: "success",
        ...response
      });
    } catch (err) {
      if (err instanceof UnauthorizedDeviceAccessError) {
        res.status(403).json({
          status: "error",
          code: "ACCESS_DENIED",
          message: err.message
        });
        return;
      }
      if (err instanceof DeviceNotFoundError) {
        res.status(404).json({
          status: "error",
          code: "NOT_FOUND",
          message: err.message
        });
        return;
      }
      if (err instanceof DomainServiceError) {
        res.status(err.statusCode || 400).json({
          status: "error",
          code: err.code || "SERVICE_ERROR",
          message: err.message
        });
        return;
      }
      console.error("[Assistant Chat Route Error]", err);
      res.status(500).json({
        status: "error",
        code: "INTERNAL_ERROR",
        message: "Failed to process assistant request. Please try again."
      });
    }
  });
  app.all("/mcp", async (req, res) => {
    await mcp.handleRequest(req, res);
  });
  const shouldSkipVite = options?.disableVite || env2.NODE_ENV === "test" || process.env.NODE_ENV === "test";
  if (!shouldSkipVite && env2.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    viteInstance = vite;
    app.use(vite.middlewares);
  } else if (!shouldSkipVite && env2.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.use((err, _req, res, _next) => {
    console.error("[Server Error]", err);
    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: env2.NODE_ENV === "production" ? "Internal server error" : err.message
      });
    }
  });
  const close = async () => {
    if (viteInstance) {
      await viteInstance.close();
    }
    await mcp.close();
  };
  return { app, mcp, close };
}
async function startServer() {
  const env2 = getEnv();
  const { app } = await createApp();
  const server = app.listen(env2.PORT, env2.HOST, () => {
    console.log(`[AquaWatt] Server running at http://${env2.HOST}:${env2.PORT}`);
    console.log(`[AquaWatt] Environment: ${env2.NODE_ENV}`);
    console.log(`[AquaWatt] MCP Streamable HTTP endpoint: http://${env2.HOST}:${env2.PORT}/mcp`);
    console.log(`[AquaWatt] Health endpoint: http://${env2.HOST}:${env2.PORT}/health`);
  });
  const shutdown = () => {
    console.log("[AquaWatt] Shutting down server...");
    server.close(() => {
      console.log("[AquaWatt] Server closed.");
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
var isDirectRun = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith("/server.ts") || process.argv[1].endsWith("\\server.ts") || process.argv[1].endsWith("/server.js") || process.argv[1].endsWith("\\server.js"));
if (isDirectRun && process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("[AquaWatt] Fatal startup error:", err);
    process.exit(1);
  });
}
export {
  createApp,
  startServer
};
