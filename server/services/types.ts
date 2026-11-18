import { z } from 'zod';

/**
 * Authentication and authorization context passed to domain services.
 */
export interface AuthContext {
  userId: string;
  userToken?: string;
  email?: string;
  role?: string;
  isServiceRole?: boolean;
}

export const AuthContextSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  userToken: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  isServiceRole: z.boolean().optional(),
});

/**
 * Standard date range query parameters
 */
export interface DateRange {
  startDate: string; // ISO 8601 string
  endDate: string;   // ISO 8601 string
}

export const DateRangeSchema = z.object({
  startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 datetime' }),
  endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 datetime' }),
}).refine(
  data => new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(),
  { message: 'startDate must be earlier than or equal to endDate', path: ['endDate'] }
);

/**
 * Aggregation periods
 */
export type AggregationPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export const AggregationPeriodSchema = z.enum(['hourly', 'daily', 'weekly', 'monthly']);

/**
 * Time range presets
 */
export type TimeRangePreset = '8h' | '24h' | '7d' | '30d';

export const TimeRangePresetSchema = z.enum(['8h', '24h', '7d', '30d']);

/**
 * Device representation returned by domain services
 */
export interface DeviceDto {
  id: string;
  userId: string;
  deviceEui: string;
  name: string;
  deviceType: 'water_meter' | 'power_monitor' | 'smart_valve' | 'submeter_panel' | 'combo_node';
  location: string;
  status: 'online' | 'standby' | 'alert' | 'offline';
  waterSensorType: string;
  powerSensorType: string;
  displayType: string;
  batteryPercent: number | null;
  signalStrengthDbm: number | null;
  firmwareVersion: string;
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standardized water metrics DTO
 * 
 * Hardware constraints:
 * FS-S401 is a turbine pulse flow meter. It does NOT contain pressure or temperature sensors.
 * Therefore, pressurePsi and temperatureC remain strictly null in physical mode unless
 * dedicated external calibrated sensors are installed.
 */
export interface WaterMetricsDto {
  deviceId: string;
  timestamp: string;
  recordedAt: string | null;
  flowRateLpm: number;
  currentUsageLiters: number;
  currentUsageGallons: number;
  dailyTotalLiters: number;
  monthlyTotalLiters: number;
  pulseCount: number | null;
  pressurePsi: number | null;
  temperatureC: number | null;
  pressureStatusNote: string;
  temperatureStatusNote: string;
  estimatedDailyCostInr: number;
  estimatedMonthlyCostInr: number;
  sensorModel: string;
  status: 'active' | 'zero_flow' | 'no_data';
}

/**
 * Standardized electricity metrics DTO
 * Follows physical hardware constraint:
 * When INA219 is unverified or missing, isAvailable is false and metrics are null.
 */
export interface ElectricityMetricsDto {
  deviceId: string;
  timestamp: string;
  recordedAt: string | null;
  isAvailable: boolean;
  hardwareStatus: 'operational' | 'uncalibrated_hardware' | 'sensor_missing';
  statusNote: string;
  sensorModel: string;
  voltageV: number | null;
  currentA: number | null;
  powerW: number | null;
  activePowerKw: number | null;
  dailyTotalKwh: number | null;
  monthlyTotalKwh: number | null;
  powerFactor: number | null;
  estimatedDailyCostInr: number | null;
  estimatedMonthlyCostInr: number | null;
}

/**
 * Combined telemetry snapshot DTO
 */
export interface TelemetrySnapshotDto {
  deviceId: string;
  device: DeviceDto;
  water: WaterMetricsDto;
  electricity: ElectricityMetricsDto;
  recordedAt: string | null;
}

/**
 * Aggregation bucket
 */
export interface AggregatedBucketDto {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  water: {
    totalLiters: number;
    totalGallons: number;
    averageFlowRateLpm: number;
    maxFlowRateLpm: number;
    minFlowRateLpm: number;
    sampleCount: number;
    costInr: number;
  };
  electricity: {
    isAvailable: boolean;
    totalKwh: number | null;
    averagePowerKw: number | null;
    maxPowerKw: number | null;
    costInr: number | null;
    sampleCount: number;
  };
}

/**
 * Period comparison DTO
 */
export interface PeriodComparisonDto {
  deviceId: string;
  metric: 'water' | 'electricity';
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalUsage: number | null;
    unit: string;
    costInr: number | null;
  };
  previousPeriod: {
    startDate: string;
    endDate: string;
    totalUsage: number | null;
    unit: string;
    costInr: number | null;
  };
  change: {
    absoluteChange: number | null;
    percentageChange: number;
    isIncrease: boolean;
    label: string;
  };
  carbonAvoidedKg: number | null;
  summary: string;
}

/**
 * Explainable Leak Detection DTO
 */
export interface PossibleLeakAnalysisDto {
  deviceId: string;
  analyzedAt: string;
  hasPossibleLeak: boolean;
  confidence: 'none' | 'low' | 'medium' | 'high';
  classification: 'unlikely' | 'possible_micro_leak' | 'possible_continuous_flow' | 'possible_high_flow_anomaly';
  observations: {
    consecutiveFlowHours: number;
    nighttimeAverageFlowLpm: number;
    minimumNonZeroFlowLpm: number;
    sampleCountAnalyzed: number;
    timeWindowEvaluated: string;
  };
  evidenceSummary: string;
  explanation: string;
  recommendedActions: string[];
  caveats: string[];
}

/**
 * Active consumption or hardware alert DTO
 */
export interface ActiveAlertDto {
  id: string;
  deviceId: string;
  title: string;
  description: string;
  type: string;
  severity: 'critical' | 'warning' | 'info' | 'resolved';
  resource: 'water' | 'electricity' | 'both';
  triggeredAt: string;
  isResolved: boolean;
  potentialCostImpactInr: number | null;
  actionRequired: string | null;
}

/**
 * Sustainability report DTO
 */
export interface SustainabilityReportDto {
  userId: string;
  generatedAt: string;
  timeRange: string;
  facilityName: string;
  waterMetrics: {
    totalLitersConsumed: number;
    totalGallonsConsumed: number;
    estimatedCostInr: number;
    waterSavedLiters: number;
    conservationVsBaselinePct: number;
  };
  electricityMetrics: {
    isAvailable: boolean;
    hardwareStatus: string;
    totalKwhConsumed: number | null;
    estimatedCostInr: number | null;
    statusNote: string;
  };
  carbonMetrics: {
    totalCarbonAvoidedKg: number | null;
    waterAvoidedKg: number;
    electricityAvoidedKg: number | null;
    calculationBasis: string;
  };
  sustainabilityScore: number;
  ratingGrade: string;
  activeAlertsSummary: string;
  recommendations: string[];
}

/**
 * Custom domain service errors
 */
export class DomainServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DomainServiceError';
  }
}

export class UnauthorizedDeviceAccessError extends DomainServiceError {
  constructor(deviceId: string, userId: string) {
    super(
      `Access denied: device '${deviceId}' does not belong to user '${userId}' or does not exist.`,
      'DEVICE_ACCESS_DENIED',
      403,
      { deviceId, userId }
    );
    this.name = 'UnauthorizedDeviceAccessError';
  }
}

export class DeviceNotFoundError extends DomainServiceError {
  constructor(deviceId: string) {
    super(`Device with ID '${deviceId}' was not found.`, 'DEVICE_NOT_FOUND', 404, { deviceId });
    this.name = 'DeviceNotFoundError';
  }
}

export class DatabaseUnavailableError extends DomainServiceError {
  constructor(message: string = 'Database service is currently unconfigured or unreachable.') {
    super(message, 'DATABASE_UNAVAILABLE', 503);
    this.name = 'DatabaseUnavailableError';
  }
}

export class UnauthenticatedError extends DomainServiceError {
  constructor(message: string = 'Authentication required. Missing Bearer JWT.') {
    super(message, 'UNAUTHENTICATED', 401);
    this.name = 'UnauthenticatedError';
  }
}

export class InvalidTokenError extends DomainServiceError {
  constructor(message: string = 'Invalid or expired authentication token.') {
    super(message, 'INVALID_TOKEN', 401);
    this.name = 'InvalidTokenError';
  }
}

