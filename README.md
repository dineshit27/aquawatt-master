# AquaWatt — Smart Water & Energy Management Platform

AquaWatt is a full-stack IoT resource monitoring application built with **React, TypeScript, Tailwind CSS, Vite, Express, Supabase (Auth + PostgreSQL + Realtime), the Model Context Protocol (MCP) SDK, and Google Gemini API integration**.

> **Project Status:** Staging & Hardware Prototype Remediation Release. Interactive demo telemetry, authenticated backend services, MCP HTTP endpoints, and Supabase PostgreSQL schema definitions are implemented in-repo; end-to-end physical ESP32-to-MQTT-to-Supabase ingestion, INA219 electrical calibration, and live remote staging environment verification are **pending**.

---

## 1. Overview & Architecture Summary

AquaWatt tracks water and DC electrical consumption across residential and testbench facilities, surfaces anomaly alerts, reconciles daily/weekly/monthly usage baselines, and exposes verified telemetry to an authenticated AI Assistant and Streamable HTTP MCP server.

The platform explicitly separates **Demo Mode** (`MockTelemetryService` deterministic + interactive fixture feeds) from **Physical Mode** (`SupabaseTelemetryService` + server-side domain services querying user-scoped Supabase tables).

---

## 2. Honest Hardware Status Matrix

| Component | Interface / Pin | Current Status | Notes |
| --- | --- | --- | --- |
| **ESP32 DevKit Microcontroller** | Wi-Fi 802.11 b/g/n | **Verified Bench Unit** | Primary edge controller (`115200` baud local serial diagnostics). |
| **FS-S401 Hall-Effect Flow Sensor** | `GPIO34` (Interrupt Pulse) | **Operational (Bench Verified)** | Measures water pulse rate, flow rate (`L/min`), and cumulative volume (`L`). |
| **16×2 Character LCD** | HD44780 / I2C | **Operational (Bench Verified)** | Local edge display for instantaneous flow and node status. |
| **INA219 Current / Voltage Monitor** | I2C Bus | **Calibration Pending** | Power telemetry columns (`voltage_v`, `current_a`, `power_w`, `active_power_kw`, `daily_total_kwh`, `monthly_total_kwh`, `power_factor`) are strictly nullable (`NULL`) until calibrated. |
| **Line Pressure Transducer** | Analog ADC | **Planned / Not Connected** | `line_pressure_psi` remains `NULL` in physical readings. |
| **Water Temperature Probe** | OneWire / NTC | **Planned / Not Connected** | `water_temp_c` remains `NULL` in physical readings. |
| **Motorized Ball Valve Relay** | GPIO Actuator | **Planned / Not Connected** | Dashboard isolation toggles are labeled **Demo Simulation** only. |

---

## 3. Intended Telemetry Pipeline

```
ESP32 (FS-S401 GPIO34 + 16x2 LCD)
  │
  ▼  (Wi-Fi 802.11 b/g/n — Pending end-to-end verification)
MQTT Broker
  │
  ▼  (Backend MQTT Subscriber / Ingestion Bridge — Pending live broker integration)
Supabase PostgreSQL (`devices`, `sensor_readings`, `alerts`, `profiles` + RLS)
  │
  ├──▶ Browser Client (`SupabaseTelemetryService` via Supabase Realtime & RLS)
  └──▶ Express Server (`server/services/*`)
         ├──▶ REST AI Assistant (`POST /api/assistant/chat`)
         └──▶ Streamable HTTP MCP Server (`POST /mcp`)
```

---

## 4. Authentication & Route Security

* **Supabase Auth Client Integration:** Supports email/password sign-in (`/login`), registration (`/signup`), sign-out, automatic session restoration (`supabase.auth.getSession()`), and live session synchronization via `supabase.auth.onAuthStateChange`.
* **Route Protection:** Protected application routes (`/dashboard`, `/analytics`, `/community`, `/subscription`) are wrapped in `ProtectedRoute` (`src/components/auth/RouteGuards.tsx`) and redirect unauthenticated visitors to `/login`. Public-only routes (`/login`, `/signup`) redirect authenticated users cleanly to the console. Public pages (`/`, `/contact`) remain accessible without sign-in.
* **Server-Side Authorization & Multi-Tenant Isolation:** Express endpoints (`/api/assistant/*`, `/mcp`) require a verified `Authorization: Bearer <supabase_jwt>` resolved via `authService.ts`. Caller-supplied `userId` values are ignored, and all domain service queries verify `device.user_id === userId` alongside Supabase Row Level Security (RLS).
* **Zero Browser Secret Exposure:** Only `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` are exposed to Vite client builds. Never expose `SUPABASE_SERVICE_ROLE_KEY` in `VITE_*` variables or browser code.

---

## 5. Supabase Setup & Schema Parity

* **Synchronized DDL:** `supabase/schema.sql` and `supabase/migrations/20261106000000_create_aquawatt_schema.sql` contain identical table definitions (`profiles`, `devices`, `sensor_readings`, `alerts`), indexes, triggers, RLS policies, Realtime publication entries, and commented testbench seed SQL.
* **Automatic Profile Provisioning Trigger:** `public.handle_new_user()` (`SECURITY DEFINER SET search_path = public`) automatically inserts a matching row in `public.profiles` (`ON CONFLICT (id) DO NOTHING`) whenever a new record is created in `auth.users`.
* **Nullable Physical Hardware Columns:** All 7 INA219 electrical columns plus `line_pressure_psi` and `water_temp_c` allow `NULL`.
* **SQL Editor Seeding Note:** The Supabase SQL Editor executes under a privileged SQL role without a browser user JWT, so `auth.uid()` evaluates to `NULL` there. Section 10 of both SQL files uses an explicit `'YOUR_AUTH_USER_UUID'::uuid` placeholder that must be replaced with an existing UUID from **Authentication > Users** before uncommenting and running.

---

## 6. Streamable HTTP MCP Server

The Express application mounts an authenticated MCP endpoint via `@modelcontextprotocol/sdk`:

* **Endpoint:** `POST /mcp`, `GET /mcp`, `DELETE /mcp` (Streamable HTTP transport)
* **Registered Tools (14):**
  * **Water (5):** `get_latest_readings`, `get_water_usage_history`, `get_water_flow_summary`, `analyze_water_anomaly`, `get_sensor_diagnostics`
  * **Electricity (4):** `get_electricity_usage`, `get_power_quality_summary`, `get_tariff_estimate`, `get_energy_optimization_recommendations`
  * **Sustainability (3):** `get_sustainability_score`, `get_savings_projection`, `generate_conservation_report`
  * **Devices (2):** `list_user_devices`, `get_device_status`
* **Registered Resources (6):** `aquawatt://devices`, `aquawatt://devices/{id}/status`, `aquawatt://devices/{id}/readings`, `aquawatt://devices/{id}/water/daily`, `aquawatt://devices/{id}/alerts`, `aquawatt://system/hardware-status`
* **Registered Prompts (5):** `daily-resource-briefing`, `water-anomaly-review`, `electricity-readiness-check`, `sustainability-coach`, `facility-audit-summary`
* **Health & Discovery Endpoints:** `GET /health`, `GET /.well-known/oauth-protected-resource/mcp`

---

## 7. MCP Authentication & Honest Protocol Scope

* **What IS Implemented:** RFC 9728 OAuth Protected Resource Metadata (`/.well-known/oauth-protected-resource/mcp`) and Bearer JWT validation using **pre-obtained Supabase Auth access tokens** (`server/services/authService.ts`). Full documentation is available in `docs/mcp-authentication.md`.
* **What Is NOT Implemented:** Interactive OAuth 2.1 Authorization Code / PKCE grant flows, Dynamic Client Registration (RFC 7591), and opaque token introspection endpoints. External MCP clients must authenticate with a valid Supabase session access token obtained through Supabase Auth.

---

## 8. Environment Variables

Configure variables locally using `.env.example` (never commit `.env.local` or secrets):

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client & Server | Supabase Project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Supabase public `anon` key (safe with RLS enforced) |
| `GEMINI_API_KEY` | Server Only | Google Gemini API key for `/api/assistant/chat` |
| `APP_URL` | Server Only | Canonical origin used in RFC 9728 metadata & CORS |
| `PORT` | Server Only | HTTP listen port (defaults to `3000`) |

---

## 9. Local Development

```bash
# 1. Install dependencies (Node.js 20.19+ or 22.12+ recommended)
npm install

# 2. Configure local environment variables
cp .env.example .env.local
# Populate VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and GEMINI_API_KEY in .env.local

# 3. Start full-stack dev server (Express + Vite middlewares on port 3000)
npm run dev
```

Open `http://localhost:3000`.

---

## 10. Build, Typecheck, Lint & Testing

```bash
# TypeScript static analysis
npm run typecheck

# ESLint check across the codebase
npm run lint

# Full automated unit, MCP, API security, and integrity test suite
npm test

# Production build (Vite client bundle -> dist/, esbuild server -> server.js)
npm run build

# Run compiled production server (requires built dist/ and server.js)
npm start

# Remove generated build artifacts (dist/, dist-server/, server.js)
npm run clean
```

---

## 11. Demo Mode vs Physical Hardware Mode

* **Demo Mode:** Pre-populated simulated timeseries feeds (bench cohort metrics, baseline variance curves, simulated valve isolation tests, and local frontend contact form simulation). Suitable for offline UI evaluation without a live Supabase project.
* **Physical Mode:** Queries authenticated Supabase tables (`devices`, `sensor_readings`, `alerts`) and subscribes to `supabase_realtime` updates. Displays explicit empty/uncalibrated states when hardware has not published readings or when `INA219` / pressure / temperature fields are `NULL`.

---

## 12. Assistant Grounding & Leak Non-Confirmation Policy

* Server-side domain tools (`server/mcp/tools/waterTools.ts`), prompts (`server/mcp/prompts/prompts.ts`), and `assistantService.ts` enforce strict **hardware boundary guardrails**.
* When `INA219`, pressure, or water temperature fields are `NULL`, the assistant must report them as pending calibration / unconnected rather than inventing figures.
* **Leak Non-Confirmation Policy:** Flow anomalies are reported strictly as elevated or continuous flow observations requiring physical inspection — never as a "confirmed leak".

---

## 13. Known Limitations & Pending Verification

1. **Physical ESP32 MQTT Bridge:** Live Wi-Fi/MQTT packet ingestion into production Supabase PostgreSQL has not been executed in this repository environment.
2. **INA219 Calibration:** DC voltage/current readings remain `NULL` in physical schema until bench calibration is completed.
3. **Contact & Subscription Billing Forms:** `/contact` ticket submission and `/subscription` plan switches operate as frontend state simulations only (no transactional email SMTP or Stripe gateway wired).
4. **Community Benchmarks:** Demo cohort entries represent deterministic prototype simulation entries rather than multi-tenant production user telemetry.
5. **Placeholder Remote Credentials:** `.env.local` in template environments uses placeholder URLs until real staging Supabase & Gemini secrets are supplied.

---

## 14. Repository Hygiene & Attribution

* Temporary reference uploads are stored outside `public/` and ignored via `.gitignore`.
* Build artifacts (`dist/`, `dist-server/`, `server.js`, `tsconfig.tsbuildinfo`, logs) are excluded from version control and cleanable via `npm run clean`.
* UI primitives under `components/base-ui/*` and `src/components/ui/*` remain isolated presentation components.

---

## 15. Troubleshooting

* **Auth redirects back to `/login` or fails with network error:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` point to a live Supabase project with Email Auth enabled.
* **Empty Physical Dashboard after sign-up:** Register a row in `public.devices` owned by your authenticated `auth.users` UUID (or run the commented Section 10 snippet in `supabase/schema.sql` after substituting `'YOUR_AUTH_USER_UUID'`).
* **MCP returns `401 Unauthorized`:** Supply `Authorization: Bearer <supabase_access_token>` obtained from an active Supabase user session.

---

## 16. License

Private / Academic & Prototype Engineering Repository (`aquawatt`). Refer to repository maintainers for licensing and staging deployment terms.
