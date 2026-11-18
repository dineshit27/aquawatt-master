# AquaWatt MCP Domain Tools Reference

This document provides the authoritative specification for the **14 Read-Only MCP Domain Tools** registered in the **AquaWatt MCP Server** (`aquawatt-mcp-server` v1.0.0).

---

## 1. Architectural Principles & Security Boundary

1. **Read-Only Invariant**: All 14 tools are non-mutating. None of the tools perform `INSERT`, `UPDATE`, or `DELETE` operations on devices, readings, alerts, or profiles.
2. **Server-Side Authentication**: Every protected tool call (`tools/call`) strictly requires a verified `AuthContext`.
   - The user identity (`userId`) is derived **exclusively** from the server-verified Supabase JWT passed via `Authorization: Bearer <token>`.
   - No tool accepts a `userId` argument. Any caller attempting to pass a spoofed `userId` is rejected.
   - Devices not belonging to the verified `userId` trigger an explicit `DEVICE_ACCESS_DENIED` error.
3. **Hardware Boundaries & Telemetry Integrity**:
   - **FS-S401 Water Flow Sensor**: Active and verified physical telemetry (flow rate in LPM, pulses, volumetric liters).
   - **INA219 Power/Current Sensor**: Hardware calibration pending. Electricity readings and power analytics return `null` / `unavailable` with explicit explanatory status notes (`INA219_PENDING_CALIBRATION`). No simulated or fabricated electrical values are ever emitted in physical mode.
   - **Line Pressure & Water Temperature**: Unverified channels in current physical hardware; returned as `null` with transparent notes.
4. **Explainable Leak Detection (No False Confirmations)**:
   - Possible leak observations require continuous flow during facility-local nighttime windows (default: `01:00` to `05:00` in `Asia/Kolkata`).
   - Every leak detection payload includes an explicit disclaimer: *"This analysis indicates an observed usage pattern and does NOT constitute a confirmed physical leak. On-site physical inspection of pipes, fixtures, and valves is required."*

---

## 2. Protocol & Transport Configuration

- **Transport**: MCP Streamable HTTP (spec version `2024-11-05` / `2025-03-26`)
- **Endpoint**: `http://localhost:3000/mcp`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json, text/event-stream`
  - `Authorization: Bearer <supabase-user-jwt>`
  - `mcp-session-id: <session-uuid>` (returned on `initialize` response)

### Claude Desktop / MCP Client Configuration Example
```json
{
  "mcpServers": {
    "aquawatt": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_SUPABASE_USER_JWT>"
      }
    }
  }
}
```

---

## 3. Catalog of the 14 MCP Domain Tools

### Device Management

#### 1. `get_device_status`
- **Description**: Retrieve operational connectivity, hardware status, and synchronization state for a registered AquaWatt IoT node.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Unique ID of the IoT device node.
- **Output Properties**:
  - `device`: Device metadata (ID, EUI, name, type, location, online/offline status, battery percent, signal strength dBm, firmware version, last sync timestamp).
  - `hardwareStatus`: Operational state of attached sensors (`FS-S401`, `INA219`, `16x2_LCD`).
  - `hasTelemetry`: Boolean indicating whether verified readings exist.
  - `lastSync`: ISO 8601 timestamp of last synchronization.

#### 2. `list_user_devices`
- **Description**: List all AquaWatt sensor monitoring devices owned by the authenticated user.
- **Input Parameters**: None (`{}`).
- **Output Properties**:
  - `totalDevices` (`number`): Count of devices registered to the user.
  - `devices` (`array`): List of device DTOs with operational parameters.

---

### Water Monitoring

#### 3. `get_latest_readings`
- **Description**: Retrieve the most recent verified sensor readings for an AquaWatt device.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
- **Output Properties**:
  - `reading`: Latest recorded data. `flowRateLpm` and `currentLiters` contain verified FS-S401 measurements; `linePressurePsi` and `waterTempC` are `null` (unverified hardware); electrical fields are `null` with status note.
  - `hardwareStatus`: Notes explaining physical sensor verification status.

#### 4. `get_water_consumption`
- **Description**: Retrieve aggregated water consumption for a selected period (hourly, daily, weekly, monthly) over a specified date range.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
  - `period` (`string`, required, enum: `'hourly' | 'daily' | 'weekly' | 'monthly'`): Aggregation bucket size.
  - `startDate` (`string`, required, ISO 8601 datetime): Start of evaluation window.
  - `endDate` (`string`, required, ISO 8601 datetime): End of evaluation window.
- **Output Properties**:
  - `deviceId`, `period`, `startDate`, `endDate`.
  - `totalLiters` (`number`): Sum of measured liters.
  - `totalM3` (`number`): Cubic meters equivalent.
  - `readingsCount` (`number`): Telemetry sample count.
  - `buckets` (`array`): Time-series aggregates (`timestamp`, `liters`, `avgFlowRateLpm`, `samples`).
  - `dataIntegrity`: Verification notice for FS-S401 flow sensor.

#### 5. `analyze_water_usage`
- **Description**: Analyze usage patterns, averages, peak flow periods, and trends for a device over a preset time range.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
  - `timeRange` (`string`, required, enum: `'8h' | '24h' | '7d' | '30d'`): Evaluation preset.
- **Output Properties**:
  - `timeRange`, `totalLiters`, `averageFlowRateLpm`, `peakFlowRateLpm`, `peakFlowTimestamp`.
  - `trend` (`'increasing' | 'decreasing' | 'stable'`): First-half vs second-half trajectory.
  - `summary`: Machine and human readable summary text.

#### 6. `compare_water_consumption`
- **Description**: Compare water consumption between two user-selected periods, evaluating percentage change, volumetric difference, and carbon impact.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
  - `currentStartDate` (`string`, required, ISO 8601 datetime)
  - `currentEndDate` (`string`, required, ISO 8601 datetime)
  - `previousStartDate` (`string`, required, ISO 8601 datetime)
  - `previousEndDate` (`string`, required, ISO 8601 datetime)
- **Output Properties**:
  - `currentPeriod` & `previousPeriod` totals.
  - `difference`: Numeric delta in liters and percentage change.
  - `carbonDifferenceKg`: Embodied municipal water carbon delta (~0.0003 kg CO2/L).
  - `trend`: Directional comparison descriptor.

#### 7. `detect_possible_leaks`
- **Description**: Run explainable possible-leak detection using actual FS-S401 turbine flow readings.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
  - `startDate` (`string`, required, ISO 8601 datetime)
  - `endDate` (`string`, required, ISO 8601 datetime)
  - `timezone` (`string`, optional, default: `'Asia/Kolkata'`): Facility timezone.
  - `nightStartHour` (`number`, optional, 0-23, default: `1`): Local night start.
  - `nightEndHour` (`number`, optional, 0-23, default: `5`): Local night end.
- **Output Properties**:
  - `hasPossibleLeak` (`boolean`): Whether continuous nocturnal flow was observed.
  - `confidence` (`'low' | 'medium' | 'high'`): Evidence confidence.
  - `evidence`: Consecutive flow hours, nighttime liters, baseline flow rate.
  - `explanation`: Transparent reason for anomaly flag.
  - `caveats`: Explicit non-confirmation disclaimers stating that on-site verification is required.

---

### Electricity Monitoring (Calibrated Hardware Boundaries)

#### 8. `get_electricity_consumption`
- **Description**: Retrieve electricity consumption for a selected period. In physical mode without verified INA219 calibration, returns explicit status without simulated figures.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID): Device identifier.
  - `period` (`string`, required, enum: `'hourly' | 'daily' | 'weekly' | 'monthly'`)
  - `startDate` (`string`, required, ISO 8601 datetime)
  - `endDate` (`string`, required, ISO 8601 datetime)
- **Output Properties**:
  - `hardwareStatus`: `'INA219_PENDING_CALIBRATION'`.
  - `totalKwh`: `null`.
  - `message`: Explaining that INA219 current/power monitoring is awaiting hardware calibration.

#### 9. `analyze_electricity_usage`
- **Description**: Analyze electricity usage patterns and peak demand. Returns pending status when INA219 telemetry is unverified.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID)
  - `timeRange` (`string`, required, enum: `'8h' | '24h' | '7d' | '30d'`)
- **Output Properties**:
  - `hardwareStatus`: `'INA219_PENDING_CALIBRATION'`.
  - `trend`: `'unknown'`.
  - `notes`: Instructions on calibration requirements before power analytics activate.

#### 10. `compare_electricity_consumption`
- **Description**: Compare electricity consumption between two user-selected periods.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID)
  - `currentStartDate`, `currentEndDate`, `previousStartDate`, `previousEndDate` (`string`, required, ISO 8601 datetime)
- **Output Properties**:
  - `comparisonStatus`: `'UNAVAILABLE_PENDING_CALIBRATION'`.
  - `differenceKwh`: `null`.

#### 11. `detect_energy_anomalies`
- **Description**: Detect electrical anomalies and consumption spikes. Returns explicit unavailable status rather than simulating anomalies.
- **Input Parameters**:
  - `deviceId` (`string`, required, UUID)
  - `startDate`, `endDate` (`string`, required, ISO 8601 datetime)
- **Output Properties**:
  - `hasAnomaly`: `false`.
  - `hardwareStatus`: `'INA219_PENDING_CALIBRATION'`.
  - `notes`: Safe refusal to fabricate false electrical anomalies.

---

### Alerts and Sustainability

#### 12. `get_active_alerts`
- **Description**: Retrieve active, unresolved telemetry alerts and threshold warnings for user devices.
- **Input Parameters**:
  - `deviceId` (`string`, optional, UUID): Optional filter for a single device.
  - `severity` (`string`, optional, default: `'all'`, enum: `'all' | 'critical' | 'warning' | 'info'`)
  - `resource` (`string`, optional, default: `'all'`, enum: `'all' | 'water' | 'energy'`)
- **Output Properties**:
  - `totalAlerts` (`number`): Count of matching active alerts.
  - `alerts` (`array`): List of alert objects (`id`, `deviceId`, `title`, `description`, `severity`, `resource`, `potentialCostImpact`, `triggeredAt`).

#### 13. `generate_sustainability_report`
- **Description**: Generate a sustainability report for the authenticated user estate, calculating total water savings, estimated carbon footprint, and sustainability scores.
- **Input Parameters**:
  - `startDate` (`string`, required, ISO 8601 datetime)
  - `endDate` (`string`, required, ISO 8601 datetime)
- **Output Properties**:
  - `period`: Evaluation start and end.
  - `waterMetrics`: Total liters measured from FS-S401, cubic meters, cost impact.
  - `electricityMetrics`: Measured kWh (`null`), notes regarding calibration.
  - `carbonFootprint`: Embodied water CO2e kg and calculation methodology.
  - `sustainabilityScore`: Calculated score (0-100) and rating (`Excellent`, `Good`, `Moderate`, `Needs Improvement`).
  - `methodologyNotes`: Transparent breakdown of measured vs estimated inputs.

#### 14. `get_utility_overview`
- **Description**: Retrieve high-level consolidated utility overview for the authenticated user, summarizing all devices, current flow, active alerts, and facility status.
- **Input Parameters**: None (`{}`).
- **Output Properties**:
  - `facility`: Name, address, configured timezone.
  - `deviceCount`: Online and total node counts.
  - `waterSummary`: Total registered water meters, total consumed volume, latest flow rate.
  - `electricitySummary`: Total power monitors, hardware status.
  - `alertsSummary`: Total unresolved, warning, and critical counts.
  - `sustainabilityRating`: Current environmental rating.

---

## 4. Error Codes & Structure

When a tool encounters an error, it returns a structured JSON payload:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\n  \"error\": {\n    \"code\": \"DEVICE_ACCESS_DENIED\",\n    \"message\": \"Access denied: device '...' does not belong to user '...' or does not exist.\"\n  }\n}"
    }
  ]
}
```

Standard Error Codes:
- `UNAUTHENTICATED` (HTTP 401 / JSON-RPC -32001): Missing or invalid Bearer JWT.
- `INVALID_PARAMS` (JSON-RPC -32602): Input validation failure (e.g. malformed UUID or invalid ISO 8601 date).
- `DEVICE_ACCESS_DENIED`: Attempt to query a device not owned by the authenticated user.
- `DEVICE_NOT_FOUND`: Device ID does not exist in the database.
- `DATABASE_UNAVAILABLE`: Supabase connection unconfigured.
- `TOOL_EXECUTION_ERROR`: Unhandled exception during domain service execution.
