-- ==============================================================================
-- AquaWatt IoT Telemetry Platform - Supabase Unified Schema
-- File: supabase/schema.sql
-- 
-- Run this complete script directly inside the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  facility_name TEXT NOT NULL DEFAULT 'AquaWatt Test Bench · Node Lab 01',
  facility_type TEXT NOT NULL DEFAULT 'Residential' CHECK (facility_type IN ('Residential', 'Commercial', 'Multi-unit', 'Industrial')),
  address TEXT DEFAULT 'Lab Bench #1 (ESP32 DevKit Telemetry Rig)',
  preferred_unit_water TEXT NOT NULL DEFAULT 'liters' CHECK (preferred_unit_water IN ('liters', 'gallons')),
  preferred_unit_energy TEXT NOT NULL DEFAULT 'kwh' CHECK (preferred_unit_energy IN ('kwh', 'mwh')),
  tier TEXT NOT NULL DEFAULT 'Standard Pro',
  sustainability_score INTEGER NOT NULL DEFAULT 85 CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. DEVICES TABLE (ESP32 Hardware Nodes)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_eui TEXT UNIQUE NOT NULL, -- e.g. 'ESP32-NODE-01' or MAC address
  name TEXT NOT NULL,              -- e.g. 'ESP32 Bench Node (FS-S401 + LCD)'
  device_type TEXT NOT NULL DEFAULT 'water_meter' CHECK (device_type IN ('water_meter', 'power_monitor', 'smart_valve', 'submeter_panel', 'combo_node')),
  location TEXT NOT NULL DEFAULT 'Main Inflow & DC Circuit',
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'standby', 'alert', 'offline')),
  water_sensor_type TEXT NOT NULL DEFAULT 'FS-S401',  -- FS-S401 turbine pulse flow meter
  power_sensor_type TEXT NOT NULL DEFAULT 'INA219',   -- INA219 DC current/voltage sensor (pending test)
  display_type TEXT NOT NULL DEFAULT '16x2_LCD',      -- 16x2 Character LCD
  battery_percent NUMERIC(5, 2) DEFAULT 100.00 CHECK (battery_percent >= 0 AND battery_percent <= 100),
  signal_strength_dbm INTEGER DEFAULT -64 CHECK (signal_strength_dbm >= -120 AND signal_strength_dbm <= 0),
  firmware_version TEXT NOT NULL DEFAULT 'v1.0.0-esp32',
  last_sync TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SENSOR READINGS TABLE (Physical Telemetry Timeseries)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- FS-S401 Water Flow Sensor telemetry (Operational)
  pulse_count INTEGER DEFAULT 0 CHECK (pulse_count >= 0),
  flow_rate_lpm NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (flow_rate_lpm >= 0),
  current_liters NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (current_liters >= 0),
  daily_total_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (daily_total_liters >= 0),
  monthly_total_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_total_liters >= 0),
  line_pressure_psi NUMERIC(6, 2) CHECK (line_pressure_psi IS NULL OR line_pressure_psi >= 0),
  water_temp_c NUMERIC(5, 2),

  -- INA219 DC Current / Voltage Monitor telemetry (Untested / In development)
  -- Nullable fields to prevent fabricated values before calibration
  voltage_v NUMERIC(8, 3) CHECK (voltage_v IS NULL OR voltage_v >= 0),
  current_a NUMERIC(8, 3),
  power_w NUMERIC(10, 3),
  active_power_kw NUMERIC(10, 3) CHECK (active_power_kw IS NULL OR active_power_kw >= 0),
  daily_total_kwh NUMERIC(12, 4) CHECK (daily_total_kwh IS NULL OR daily_total_kwh >= 0),
  monthly_total_kwh NUMERIC(12, 4) CHECK (monthly_total_kwh IS NULL OR monthly_total_kwh >= 0),
  power_factor NUMERIC(4, 3) CHECK (power_factor IS NULL OR (power_factor >= -1 AND power_factor <= 1)),
  
  sensor_notes TEXT DEFAULT 'FS-S401 Active · INA219 Pending Hardware Calibration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CONSUMPTION ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leak_detected', 'power_spike', 'continuous_flow', 'threshold_exceeded', 'device_offline')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'resolved')),
  resource TEXT NOT NULL CHECK (resource IN ('water', 'electricity', 'both')),
  estimated_wastage TEXT,
  potential_cost_impact NUMERIC(10, 2) CHECK (potential_cost_impact IS NULL OR potential_cost_impact >= 0),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  action_required TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON public.sensor_readings(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON public.sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device_status ON public.alerts(device_id, is_resolved, triggered_at DESC);

-- 7. TIMESTAMPS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_devices_updated_at ON public.devices;
CREATE TRIGGER set_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Devices Policies
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
CREATE POLICY "Users can view own devices"
  ON public.devices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own devices" ON public.devices;
CREATE POLICY "Users can insert own devices"
  ON public.devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
CREATE POLICY "Users can update own devices"
  ON public.devices FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;
CREATE POLICY "Users can delete own devices"
  ON public.devices FOR DELETE
  USING (auth.uid() = user_id);

-- Sensor Readings Policies
DROP POLICY IF EXISTS "Users can view sensor readings for own devices" ON public.sensor_readings;
CREATE POLICY "Users can view sensor readings for own devices"
  ON public.sensor_readings FOR SELECT
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert sensor readings for own devices" ON public.sensor_readings;
CREATE POLICY "Users can insert sensor readings for own devices"
  ON public.sensor_readings FOR INSERT
  WITH CHECK (
    device_id IN (
      SELECT id FROM public.devices WHERE user_id = auth.uid()
    )
  );

-- Alerts Policies
DROP POLICY IF EXISTS "Users can view alerts for own devices" ON public.alerts;
CREATE POLICY "Users can view alerts for own devices"
  ON public.alerts FOR SELECT
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update alerts for own devices" ON public.alerts;
CREATE POLICY "Users can update alerts for own devices"
  ON public.alerts FOR UPDATE
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert alerts for own devices" ON public.alerts;
CREATE POLICY "Users can insert alerts for own devices"
  ON public.alerts FOR INSERT
  WITH CHECK (
    device_id IN (
      SELECT id FROM public.devices WHERE user_id = auth.uid()
    )
  );

-- 9. REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sensor_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;
END $$;
