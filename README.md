# AquaWatt — Smart Water & Energy Management SaaS

AquaWatt is a high-performance resource management platform built with React, TypeScript, Tailwind CSS, Vite, Supabase, and Lucide Icons. It monitors facility-level water and electricity consumption, flags anomalous spikes and nocturnal weepage, and provides actionable conservation insights.

---

## 1. Technical Architecture & Hardware Reality

### Hardware Layer
* **Microcontroller:** ESP32 (Tensilica Xtensa Dual-Core 32-bit LX6 with Wi-Fi & Bluetooth).
* **Water Flow Sensor:** **FS-S401** Hall-effect turbine pulse flow sensor (**Operational**). Measures rotational pulse frequency via ESP32 GPIO interrupt pins.
* **Display Output:** **16×2 Character LCD** (HD44780 controller / I2C backpack) (**Operational**). Provides local real-time flow rate and status displays.
* **Electrical Sensor:** **INA219** High-side DC Current/Voltage monitor (**Untested / In Development**).
  * *Notice:* All voltage, current, and active power fields are strictly **NULLABLE** in both the Supabase database schema and the frontend telemetry service. AquaWatt **never generates fabricated power values** while physical hardware mode is active.
* **Serial Diagnostic Terminal:** ESP32 local serial debug output configured at **115200 baud**.

### Telemetry Transport & Backend
* **Communication:** Wi-Fi (802.11 b/g/n) and MQTT over TCP.
* **Cloud Database:** **Supabase (PostgreSQL 15+)** with Row Level Security (RLS) enabled.
* **Dual-Mode Telemetry Architecture:**
  * **Demo Mode:** Interactive simulated testbench feeds provided by `MockTelemetryService` with realistic jitter, 8h/24h/30d reconciled baseline comparisons, and incident triage demonstrations.
  * **Physical Hardware Mode:** Directly queries the user's Supabase database (`devices`, `sensor_readings`, `alerts`) via `@supabase/supabase-js` and listens to live hardware telemetry using Supabase Realtime channels (`supabase_realtime` publication).

---

## 2. Supabase Integration (Phase 2)

AquaWatt connects to an external Supabase project while preserving all existing UI and analytics components.

### Database Tables Created
1. **`profiles`:** User facility preferences, preferred units (`liters`/`gallons`, `kwh`/`mwh`), sustainability scores, and subscription tiers.
2. **`devices`:** Registered ESP32 hardware nodes (`device_eui`, hardware types `FS-S401`, `INA219`, `16x2_LCD`, Wi-Fi RSSI, battery percent, and sync timestamps).
3. **`sensor_readings`:** Timeseries records containing FS-S401 pulse flow rates, total volume consumed, line pressure, and nullable INA219 DC voltage/current/power fields.
4. **`alerts`:** Hardware and anomaly incident logs with severity levels (`critical`, `warning`, `info`, `resolved`) linked to physical device IDs.

### Security & Access Control
* **Row Level Security (RLS):** Enabled on all 4 tables.
* **Zero Unauthorized Access:** Anonymous clients cannot view private telemetry records. Authenticated users are strictly restricted to devices and telemetry where `devices.user_id = auth.uid()`.
* **Trusted Ingestion Boundary:** In production, the ESP32 publishes readings to an MQTT Broker. A trusted backend bridge or Supabase Edge Function ingests MQTT payloads into `sensor_readings` using the Supabase `service_role` key. The browser client only uses the public `anon` key.

---

## 3. Supabase Setup Guide & Manual Actions

Follow these steps to configure your Supabase project:

### Step 1: Open your Supabase Project
1. Log in to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your AquaWatt project (or create a new empty project).

### Step 2: Run SQL Migrations in Supabase
1. In the Supabase left sidebar, click **SQL Editor**.
2. Click **New Query**.
3. Open the migration file in this repository:
   * **`supabase/schema.sql`** (or `supabase/migrations/20261106000000_create_aquawatt_schema.sql`)
4. Copy the entire SQL content and paste it into the Supabase SQL editor.
5. Click **Run**.
6. Verify that tables `profiles`, `devices`, `sensor_readings`, and `alerts` appear under **Database > Tables** with Row Level Security enabled.

### Step 3: Configure Environment Variables (.env.local)
1. In the Supabase left sidebar, go to **Project Settings > API**.
2. Copy your **Project URL** and your **anon (public)** key.
3. In your local project directory, edit `.env.local`:
   ```bash
   # .env.local is already created and ignored by git
   ```
4. Set the following environment variables:
   ```env
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
   ```
   *Note: Never paste the `service_role` secret key into `.env.local` or client-side code.*

### Step 4: Launch the Dashboard & Switch to Physical Mode
1. Start the dev server (`npm run dev`).
2. Navigate to **Console (`/dashboard`)**.
3. In the top Mission Control bar, click **Physical (Supabase)**.
4. If the database is freshly created without hardware records yet, the dashboard will display the clean **Awaiting Ingestion** status banner without throwing errors.
5. (Optional) Run the testbench seed snippet at the bottom of `supabase/schema.sql` to populate an initial test row.

---

## 4. Getting Started

### Prerequisites
* Node.js 20.19.0+ or 22.12.0+ (required by Vite 8)
* npm 9+

### Installation
```bash
# Clone the repository and install dependencies
npm install
```

### Development
```bash
# Start the local development server (runs on port 3000)
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

### Verification & Testing
```bash
# Run the 18-test unit suite (mathematical reconciliation, tariffs, and Supabase physical defaults)
npm test

# Run TypeScript typecheck / lint
npm run lint

# Compile production bundle
npm run build
```

---

## 5. Software Architecture & Telemetry Separation

```
                       [ Physical ESP32 Hardware ]
                        ├── FS-S401 Flow Sensor (Interrupt)
                        ├── 16x2 Character LCD Display
                        └── INA219 DC Sensor (Untested / Null)
                                     │
                             (Wi-Fi / MQTT JSON)
                                     ▼
                      [ Supabase Cloud Database ]
                        ├── profiles (RLS)
                        ├── devices (RLS)
                        ├── sensor_readings (RLS + Realtime)
                        └── alerts (RLS)
                                     │
                                     ▼
                      [ SupabaseTelemetryService ]
                                     │
                                     ▼
                             [ AppContext.tsx ]
                     (telemetrySourceMode: 'demo' | 'physical')
                            /                  \
                           /                    \
              [ Demo Mode ]                      [ Physical Mode ]
           MockTelemetryService              Real Supabase Tables
          (Jitter + Baseline Math)        (Real Readings / Null INA219)
                           \                    /
                            \                  /
                             ▼                ▼
                 [ Mission Control Dashboard & Analytics ]
```
