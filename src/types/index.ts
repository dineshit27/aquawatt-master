export type ResourceType = 'water' | 'electricity' | 'all';

export type TelemetryDataSourceMode = 'demo' | 'physical';

export interface WaterReading {
  timestamp: string;
  recordedAt?: string;
  deviceId?: string;
  flowRateLpm: number;         // Liters per minute (flow_rate_lpm)
  currentUsageGallons: number; // Gallons (derived from current_liters)
  currentUsageLiters: number;  // Liters (current_liters)
  dailyTotalLiters: number;    // daily_total_liters
  monthlyTotalLiters: number;  // monthly_total_liters
  pressurePsi: number | null;  // line_pressure_psi
  temperatureC: number | null; // water_temp_c
  pulseCount?: number | null;  // pulse_count
  isPhysical?: boolean;
  isSimulated?: boolean;
  sensorModel?: string;        // e.g. 'FS-S401'
}

export interface ElectricityReading {
  timestamp: string;
  recordedAt?: string;
  deviceId?: string;
  // NOTE: INA219 DC sensor is untested / in development.
  // Power, voltage, current and energy are strictly nullable in physical mode.
  activePowerKw: number | null; // active_power_kw
  powerW?: number | null;       // power_w
  voltageVolts: number | null;  // voltage_v
  currentAmperes: number | null;// current_a
  frequencyHz: number | null;
  dailyTotalKwh: number | null; // daily_total_kwh
  monthlyTotalKwh: number | null;// monthly_total_kwh
  powerFactor: number | null;   // power_factor
  sensorNotes?: string | null;  // sensor_notes
  isPhysical?: boolean;
  isSimulated?: boolean;
  statusNote?: string;          // e.g. 'INA219 Pending Test'
  sensorModel?: string;         // e.g. 'INA219'
}

export type DeviceStatus = 'online' | 'standby' | 'alert' | 'offline';

export interface SensorDevice {
  id: string;
  name: string;
  type: 'water_meter' | 'power_monitor' | 'smart_valve' | 'submeter_panel' | 'combo_node';
  location: string;
  status: DeviceStatus;
  batteryPercent: number;
  signalStrengthDbm: number;
  firmwareVersion: string;
  lastSync: string;
  isSimulated: boolean;
  deviceEui?: string;
  waterSensorType?: 'FS-S401' | 'YF-S201' | 'none' | 'other';
  powerSensorType?: 'INA219' | 'SCT-013' | 'none' | 'other';
  displayType?: '16x2_LCD' | 'none' | 'other';
}

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'resolved';

export interface ConsumptionAlert {
  id: string;
  title: string;
  description: string;
  type: 'leak_detected' | 'power_spike' | 'continuous_flow' | 'threshold_exceeded' | 'device_offline';
  severity: AlertSeverity;
  resource: 'water' | 'electricity';
  timestamp: string;
  location: string;
  estimatedWastage?: string;
  potentialCostImpact?: number;
  isRead: boolean;
  isResolved: boolean;
  actionRequired?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  resource: 'water' | 'electricity';
  impactLevel: 'high' | 'medium' | 'low';
  estimatedSavingsMonthly: number; // in USD
  estimatedResourceSaved: string;  // e.g. "1,450 Liters/mo"
  difficulty: 'easy' | 'moderate' | 'advanced';
  category: 'efficiency' | 'schedule' | 'hardware' | 'behavior';
  status: 'active' | 'applied' | 'dismissed';
}

export interface HourlyConsumptionPoint {
  hour: string;
  waterLiters: number;
  electricityKwh: number;
  waterCostInr: number;
  electricityCostInr: number;
  baselineWater: number;
  baselineElectricity: number;
}

export interface DailyComparisonPoint {
  date: string;
  dayName: string;
  waterCurrent: number;
  waterPrevious: number;
  electricityCurrent: number;
  electricityPrevious: number;
}

export interface ZoneDistribution {
  id: string;
  zoneName: string;
  waterSharePercent: number;
  electricitySharePercent: number;
  waterLiters: number;
  electricityKwh: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  facilityName: string;
  facilityType: 'Residential' | 'Commercial' | 'Multi-unit' | 'Industrial';
  address: string;
  preferredUnitWater: 'liters' | 'gallons';
  preferredUnitEnergy: 'kwh' | 'mwh';
  joinedDate: string;
  tier: 'Free Explorer' | 'Standard Pro' | 'Enterprise Eco';
  sustainabilityScore: number; // 0-100
}

export interface SubscriptionPlan {
  id: 'free' | 'standard' | 'premium';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearlyMonthlyEquivalent: number;
  popular?: boolean;
  features: string[];
  limits: {
    sensorsMax: number | 'Unlimited';
    dataRetentionDays: number | 'Unlimited';
    alertSpeed: string;
    aiInsightsFrequency: string;
    supportLevel: string;
    multiLocation: boolean;
  };
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  category: 'water' | 'electricity' | 'combined';
  targetReductionPercent: number;
  durationDays: number;
  daysRemaining: number;
  participantsCount: number;
  status: 'available' | 'joined' | 'in_progress' | 'completed';
  badgeReward: string;
  rewardPoints: number;
  userProgressPercent: number;
  targetMetric: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  location: string;
  avatarInitials: string;
  waterSavedLiters: number;
  electricitySavedKwh: number;
  carbonAvoidedKg: number;
  ecoScore: number;
  badges: string[];
  isCurrentUser?: boolean;
}
