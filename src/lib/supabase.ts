import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  facility_name: string;
  facility_type: 'Residential' | 'Commercial' | 'Multi-unit' | 'Industrial';
  address: string | null;
  preferred_unit_water: 'liters' | 'gallons';
  preferred_unit_energy: 'kwh' | 'mwh';
  tier: string;
  sustainability_score: number;
  created_at: string;
  updated_at: string;
};

export type DeviceRow = {
  id: string;
  user_id: string;
  device_eui: string;
  name: string;
  device_type: 'water_meter' | 'power_monitor' | 'smart_valve' | 'submeter_panel' | 'combo_node';
  location: string;
  status: 'online' | 'standby' | 'alert' | 'offline';
  water_sensor_type: string;
  power_sensor_type: string;
  display_type: string;
  battery_percent: number | null;
  signal_strength_dbm: number | null;
  firmware_version: string;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
};

export type SensorReadingRow = {
  id: string;
  device_id: string;
  recorded_at: string;
  // Water telemetry (FS-S401 flow sensor)
  pulse_count: number | null;
  flow_rate_lpm: number;
  current_liters: number;
  daily_total_liters: number;
  monthly_total_liters: number;
  line_pressure_psi: number | null;
  water_temp_c: number | null;
  // Electrical telemetry (INA219 DC sensor - Note: NULLABLE as INA219 is untested)
  voltage_v: number | null;
  current_a: number | null;
  power_w: number | null;
  active_power_kw: number | null;
  daily_total_kwh: number | null;
  monthly_total_kwh: number | null;
  power_factor: number | null;
  sensor_notes: string | null;
  created_at: string;
};

export type AlertRow = {
  id: string;
  device_id: string;
  title: string;
  description: string;
  type: 'leak_detected' | 'power_spike' | 'continuous_flow' | 'threshold_exceeded' | 'device_offline';
  severity: 'critical' | 'warning' | 'info' | 'resolved';
  resource: 'water' | 'electricity' | 'both';
  estimated_wastage: string | null;
  potential_cost_impact: number | null;
  is_read: boolean;
  is_resolved: boolean;
  action_required: string | null;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      devices: {
        Row: DeviceRow;
        Insert: Partial<DeviceRow> & { user_id: string; device_eui: string; name: string };
        Update: Partial<DeviceRow>;
        Relationships: [];
      };
      sensor_readings: {
        Row: SensorReadingRow;
        Insert: Partial<SensorReadingRow> & { device_id: string };
        Update: Partial<SensorReadingRow>;
        Relationships: [];
      };
      alerts: {
        Row: AlertRow;
        Insert: Partial<AlertRow> & { device_id: string; title: string; description: string };
        Update: Partial<AlertRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key] !== undefined) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
};

export const getSupabaseUrl = (): string => getEnvVar('VITE_SUPABASE_URL') || '';
export const getSupabaseAnonKey = (): string => getEnvVar('VITE_SUPABASE_ANON_KEY') || '';

/**
 * Validates whether the Supabase environment variables have been supplied
 * and are not placeholder template values.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = getEnvVar('VITE_SUPABASE_URL');
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (!url || !key) {
    return false;
  }
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  if (
    trimmedUrl === '' ||
    trimmedKey === '' ||
    trimmedUrl.includes('your-project-id') ||
    trimmedUrl.includes('your-project-ref') ||
    trimmedUrl.includes('example.com') ||
    trimmedUrl.includes('YOUR_') ||
    trimmedKey.includes('your-anon') ||
    trimmedKey.includes('placeholder') ||
    trimmedKey.includes('YOUR_')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Creates or returns the typed Supabase client singleton.
 * Returns null if Supabase environment variables are missing or placeholders.
 */
export const createSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = getEnvVar('VITE_SUPABASE_URL');
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY');

  try {
    return createClient<Database>(url!.trim(), key!.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[AquaWatt] Failed to initialize Supabase client:', err);
    return null;
  }
};

export const supabase: SupabaseClient<Database> | null = createSupabaseClient();

export interface SupabaseConnectionResult {
  isConfigured: boolean;
  isReachable: boolean;
  status: 'unconfigured' | 'connected' | 'auth_error' | 'schema_error' | 'network_error';
  message: string;
  error?: string;
  latencyMs?: number;
  urlHost?: string;
}

/**
 * Diagnostic connection check to verify if Supabase is both configured
 * and reachable over the network using standard RLS permissions.
 * Never uses or requires service-role privileges.
 */
export const checkSupabaseConnection = async (): Promise<SupabaseConnectionResult> => {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      isReachable: false,
      status: 'unconfigured',
      message: 'Supabase credentials are not configured or contain template placeholders in .env.local.',
      error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    };
  }

  const client = supabase || createSupabaseClient();
  if (!client) {
    return {
      isConfigured: false,
      isReachable: false,
      status: 'unconfigured',
      message: 'Failed to instantiate Supabase client with current credentials.',
    };
  }

  const url = getEnvVar('VITE_SUPABASE_URL')?.trim();
  let host = '';
  try {
    if (url) host = new URL(url).host;
  } catch {
    // ignore
  }

  const start = Date.now();
  try {
    // Attempt standard RLS query against public.devices with anon client
    const { data: _data, error, status } = await client
      .from('devices')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      const errLower = (error.message || '').toLowerCase();
      // Auth or JWT error
      if (
        status === 401 ||
        status === 403 ||
        error.code === 'PGRST301' ||
        errLower.includes('jwt') ||
        errLower.includes('apikey') ||
        errLower.includes('invalid api key')
      ) {
        return {
          isConfigured: true,
          isReachable: false,
          status: 'auth_error',
          latencyMs,
          urlHost: host,
          message: 'Authentication failed. Please verify that VITE_SUPABASE_ANON_KEY matches your Supabase anon/public key.',
          error: error.message,
        };
      }

      // Schema or missing table error
      if (
        status === 404 ||
        error.code === '42P01' ||
        errLower.includes('does not exist') ||
        errLower.includes('schema cache')
      ) {
        return {
          isConfigured: true,
          isReachable: false,
          status: 'schema_error',
          latencyMs,
          urlHost: host,
          message: 'Connected to Supabase endpoint, but table `public.devices` was not found. Please execute /supabase/schema.sql in the SQL Editor.',
          error: error.message,
        };
      }

      return {
        isConfigured: true,
        isReachable: false,
        status: 'network_error',
        latencyMs,
        urlHost: host,
        message: `Supabase query returned error (${error.code || status}): ${error.message}`,
        error: error.message,
      };
    }

    return {
      isConfigured: true,
      isReachable: true,
      status: 'connected',
      latencyMs,
      urlHost: host,
      message: `Successfully connected to Supabase (${host}) and verified RLS table access.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      isConfigured: true,
      isReachable: false,
      status: 'network_error',
      latencyMs,
      urlHost: host,
      message: 'Network request failed. Unable to reach Supabase host. Check your network or URL.',
      error: err?.message || 'Network error',
    };
  }
};

