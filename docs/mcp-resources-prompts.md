# AquaWatt MCP Resources & Reusable Prompts Reference

This document provides the authoritative specification for the **6 MCP Resources** and **5 Reusable MCP Prompts** implemented in the **AquaWatt MCP Server** (`aquawatt-mcp-server` v1.0.0).

---

## 1. Architectural & Security Principles

1. **Read-Only Invariant**: Resources and prompts strictly provide read-only access. No database mutations, insertions, or updates occur.
2. **Server-Side Authentication**: Every protected resource read (`resources/read`) and prompt generation (`prompts/get`) strictly requires a verified `AuthContext` derived exclusively from a valid Supabase Bearer JWT (`Authorization: Bearer <jwt>`).
3. **Hardware Boundaries & Telemetry Integrity**:
   - **FS-S401 Turbine Flow Sensor**: Physical pulse-flow measurements are verified and active (flow rate in LPM, accumulated daily/monthly volume in liters).
   - **INA219 DC Voltage / Current Sensor**: Hardware calibration pending. Returns explicit status (`INA219_PENDING_CALIBRATION`) with `null` consumption and power metrics. No simulated electrical figures are ever emitted.
   - **Line Pressure & Water Temperature**: Unverified channels in current physical rig; returned strictly as `null` with transparent explanatory notes.
4. **Explainable Leak Detection (Non-Confirmation Mandate)**:
   - Possible leak observations are based on continuous nocturnal flow during local off-peak hours (default: `01:00` to `05:00` in `Asia/Kolkata`).
   - All prompts and resources strictly maintain the non-confirmation disclaimer: *"This analysis indicates an observed flow pattern and does NOT constitute a confirmed physical leak. On-site inspection of valves, fixtures, and meters is required."*

---

## 2. Part A: The 6 MCP Resources

### Overview of Resource URIs

| Resource URI | Type | Name | MIME Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `aquawatt://devices` | Static | `user-devices` | `application/json` | Enumerate all IoT devices owned by the authenticated user with operational status and hardware capabilities |
| `aquawatt://devices/{deviceId}/status` | Template | `device-status` | `application/json` | Operational connectivity, battery percent, signal dBm, and synchronization state |
| `aquawatt://devices/{deviceId}/latest-readings` | Template | `device-latest-readings` | `application/json` | Latest verified telemetry; null for uncalibrated electrical/pressure/temperature channels |
| `aquawatt://devices/{deviceId}/water-summary` | Template | `device-water-summary` | `application/json` | Consumption summary, today/monthly volume, flow rate, and FS-S401 hardware notices |
| `aquawatt://devices/{deviceId}/electricity-summary` | Template | `device-electricity-summary` | `application/json` | INA219 power monitoring readiness, calibration requirements, and explicit unavailable notices |
| `aquawatt://devices/{deviceId}/alerts` | Template | `device-alerts` | `application/json` | Active, unresolved alerts and cost impact for the target device |

---

### Resource Details & Response Payloads

#### 1. `aquawatt://devices`
- **URI**: `aquawatt://devices`
- **Authentication**: Required (`Authorization: Bearer <token>`)
- **Example Response**:
```json
{
  "totalDevices": 1,
  "devices": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "userId": "11111111-1111-4111-a111-111111111111",
      "deviceEui": "ESP32-NODE-01",
      "name": "ESP32 Flow Lab (FS-S401 + LCD)",
      "deviceType": "combo_node",
      "location": "Lab Station #1",
      "status": "online",
      "batteryPercent": 100,
      "signalStrengthDbm": -64,
      "firmwareVersion": "v1.0.0-esp32",
      "lastSync": "2026-11-09T08:00:00Z",
      "hardwareAvailability": {
        "waterSensor": "FS-S401 (Turbine Hall-Effect · Verified physical)",
        "electricalSensor": "INA219 (DC Voltage/Current · Calibration pending)",
        "display": "16x2 LCD (Hardware mounted)",
        "pressureSensor": "Unverified (Null in physical mode)",
        "temperatureSensor": "Unverified (Null in physical mode)"
      }
    }
  ]
}
```

#### 2. `aquawatt://devices/{deviceId}/status`
- **URI Template**: `aquawatt://devices/{deviceId}/status`
- **Ownership**: Strictly enforced (`deviceId` must belong to authenticated `userId`).
- **Example Response**:
```json
{
  "deviceId": "33333333-3333-4333-8333-333333333333",
  "deviceName": "ESP32 Flow Lab (FS-S401 + LCD)",
  "status": "online",
  "isOnline": true,
  "lastSeen": "2026-11-09T08:00:00Z",
  "hardwareStatus": {
    "waterSensor": "FS-S401 Turbine Flow Sensor (Operational)",
    "powerSensor": "INA219 DC Sensor (Installed, Pending Calibration)"
  },
  "device": {
    "id": "33333333-3333-4333-8333-333333333333",
    "name": "ESP32 Flow Lab (FS-S401 + LCD)",
    "deviceType": "combo_node",
    "location": "Lab Station #1",
    "status": "online",
    "batteryPercent": 100,
    "signalStrengthDbm": -64,
    "firmwareVersion": "v1.0.0-esp32"
  }
}
```

#### 3. `aquawatt://devices/{deviceId}/latest-readings`
- **URI Template**: `aquawatt://devices/{deviceId}/latest-readings`
- **Hardware Boundary**: Uncalibrated INA219 fields and unverified pressure/temp are explicitly `null`.
- **Example Response**:
```json
{
  "deviceId": "33333333-3333-4333-8333-333333333333",
  "recordedAt": "2026-11-09T08:00:00Z",
  "water": {
    "deviceId": "33333333-3333-4333-8333-333333333333",
    "flowRateLpm": 3.2,
    "currentUsageLiters": 25.0,
    "dailyTotalLiters": 175.0,
    "monthlyTotalLiters": 3225.0,
    "pulseCount": 240,
    "pressurePsi": null,
    "temperatureC": null,
    "pressureStatusNote": "Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.",
    "temperatureStatusNote": "Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig.",
    "estimatedDailyCostInr": 2.19,
    "sensorModel": "FS-S401",
    "status": "active"
  },
  "electricity": {
    "deviceId": "33333333-3333-4333-8333-333333333333",
    "isAvailable": false,
    "voltageV": null,
    "currentA": null,
    "powerW": null,
    "activePowerKw": null,
    "dailyTotalKwh": null,
    "monthlyTotalKwh": null,
    "powerFactor": null,
    "statusNote": "INA219 Power Monitoring: Pending Hardware Calibration. Electrical metrics withheld in physical mode.",
    "sensorModel": "INA219",
    "status": "unavailable"
  }
}
```

#### 4. `aquawatt://devices/{deviceId}/water-summary`
- **URI Template**: `aquawatt://devices/{deviceId}/water-summary`
- **Example Response**:
```json
{
  "deviceId": "33333333-3333-4333-8333-333333333333",
  "deviceName": "ESP32 Flow Lab (FS-S401 + LCD)",
  "location": "Lab Station #1",
  "sensorModel": "FS-S401 Turbine Flow Meter",
  "status": "online",
  "telemetry": {
    "flowRateLpm": 3.2,
    "todayUsageLiters": 175.0,
    "todayUsageGallons": 46.23,
    "monthlyTotalLiters": 3225.0,
    "estimatedDailyCostInr": 2.19,
    "estimatedMonthlyCostInr": 40.31,
    "lastRecordedAt": "2026-11-09T08:00:00Z"
  },
  "hardwareIntegrity": {
    "pulseFlowSensor": "Verified physical telemetry from FS-S401 turbine.",
    "pressureSensor": "Sensor unverified: No confirmed pressure transducer on physical FS-S401 test rig.",
    "temperatureSensor": "Sensor unverified: No confirmed temperature sensor on physical FS-S401 test rig."
  }
}
```

#### 5. `aquawatt://devices/{deviceId}/electricity-summary`
- **URI Template**: `aquawatt://devices/{deviceId}/electricity-summary`
- **Example Response**:
```json
{
  "deviceId": "33333333-3333-4333-8333-333333333333",
  "deviceName": "ESP32 Flow Lab (FS-S401 + LCD)",
  "location": "Lab Station #1",
  "sensorModel": "INA219 High-Side DC Current & Voltage Sensor",
  "isAvailable": false,
  "hardwareStatus": "INA219_PENDING_CALIBRATION",
  "metrics": {
    "voltageV": null,
    "currentA": null,
    "powerW": null,
    "activePowerKw": null,
    "dailyTotalKwh": null,
    "monthlyTotalKwh": null,
    "powerFactor": null
  },
  "statusNote": "INA219 Power Monitoring: Pending Hardware Calibration. Electrical metrics withheld in physical mode.",
  "calibrationNotice": "INA219 DC power telemetry is awaiting bench calibration against calibrated multimeter and shunt resistor verification. Simulated electrical values are strictly prohibited in physical mode."
}
```

#### 6. `aquawatt://devices/{deviceId}/alerts`
- **URI Template**: `aquawatt://devices/{deviceId}/alerts`
- **Example Response**:
```json
{
  "deviceId": "33333333-3333-4333-8333-333333333333",
  "deviceName": "ESP32 Flow Lab (FS-S401 + LCD)",
  "totalActiveAlerts": 1,
  "alerts": [
    {
      "id": "res-alert-001",
      "deviceId": "33333333-3333-4333-8333-333333333333",
      "title": "High Night Flow Observation",
      "description": "Continuous water flow recorded during off-peak hours.",
      "severity": "warning",
      "resource": "water",
      "potentialCostImpact": 0.75,
      "triggeredAt": "2026-11-09T03:00:00Z"
    }
  ],
  "retrievedAt": "2026-11-09T09:30:00.000Z"
}
```

---

## 3. Part B: The 5 Reusable MCP Prompts

### Overview of Prompts

| Prompt Name | Purpose | Arguments | Target Audience |
| :--- | :--- | :--- | :--- |
| `water-saving-advisor` | Analyze consumption and provide actionable water-saving advice | `deviceId` (UUID, req), `timeRange` (opt) | Sustainability / Facility Managers |
| `electricity-usage-review` | Review electrical hardware state and calibration requirements | `deviceId` (UUID, req), `timeRange` (opt) | IoT Hardware Engineers |
| `leak-investigation` | Investigate nocturnal flow with explainable non-leak caveats | `deviceId` (UUID, req), `timezone`, `nightStartHour`, `nightEndHour` (opt) | Maintenance Technicians |
| `monthly-sustainability-report` | Executive monthly report distinguishing measured vs estimated ESG data | `month` (opt), `deviceId` (opt) | Executive / ESG Stakeholders |
| `household-utility-review` | Whole-estate operational health briefing across devices and alerts | None (`{}`) | Facility Operators |

---

### Prompt Instructions & Guidance

#### 1. `water-saving-advisor`
- **Arguments**:
  - `deviceId` (`string`, required, UUID): Identifier of the monitoring node.
  - `timeRange` (`string`, optional, enum: `'24h' | '7d' | '30d'`, default: `'7d'`): Evaluation period.
- **Workflow & AI Directive**:
  1. Inspects `aquawatt://devices/{deviceId}/water-summary`.
  2. Invokes tool `analyze_water_usage` for trajectory analysis.
  3. Tests for nocturnal continuous flow with tool `detect_possible_leaks`.
  4. Delivers an efficiency scorecard with volumetric savings, payback estimates, and fixture audit reminders.

#### 2. `electricity-usage-review`
- **Arguments**:
  - `deviceId` (`string`, required, UUID): Identifier of the node.
  - `timeRange` (`string`, optional, default: `'24h'`): Evaluation window.
- **Workflow & AI Directive**:
  1. Reads `aquawatt://devices/{deviceId}/electricity-summary`.
  2. Mandates explicit disclosure of `INA219_PENDING_CALIBRATION`.
  3. Strictly forbids simulating or fabricating kilowatt-hour totals.
  4. Outlines physical bench testing checklist (I2C address check, shunt resistor rating, multimeter verification).

#### 3. `leak-investigation`
- **Arguments**:
  - `deviceId` (`string`, required, UUID): Identifier of the node.
  - `timezone` (`string`, optional, default: `'Asia/Kolkata'`): Facility timezone.
  - `nightStartHour` (`string`, optional, default: `'1'`): Start hour of nocturnal window (0-23).
  - `nightEndHour` (`string`, optional, default: `'5'`): End hour of nocturnal window (0-23).
- **Workflow & AI Directive**:
  1. Inspects active warnings via `aquawatt://devices/{deviceId}/alerts`.
  2. Invokes tool `detect_possible_leaks` across local nocturnal window.
  3. **STRICT MANDATE**: Never state a leak is confirmed. Treats findings as an *unusual flow observation*.
  4. Enumerates legitimate exclusions (automated irrigation, water softener regeneration, cooling tower top-up).
  5. Provides structured on-site inspection protocol (toilet flapper dye test, RO discharge check, meter isolation test).

#### 4. `monthly-sustainability-report`
- **Arguments**:
  - `month` (`string`, optional, format: `YYYY-MM`): Billing/reporting month.
  - `deviceId` (`string`, optional, UUID): Device filter.
- **Workflow & AI Directive**:
  1. Reads `aquawatt://devices` for estate topology.
  2. Calls tool `generate_sustainability_report`.
  3. Delineates physical measurements (FS-S401 liters) from calculated estimates (embodied carbon ~0.0003 kg CO2/L).
  4. Notes pending electrical sensor calibration.
  5. Outputs sustainability index (0-100), rating tier, and 3 strategic ESG recommendations.

#### 5. `household-utility-review`
- **Arguments**: None (`{}`).
- **Workflow & AI Directive**:
  1. Reads `aquawatt://devices` for online/offline device inventory.
  2. Calls tool `get_utility_overview` for high-level facility status.
  3. Calls tool `get_active_alerts` with severity `"all"`.
  4. Synthesizes IoT fleet health (battery, WiFi dBm), real-time flow rate, electrical subsystem readiness, and urgent operator action items.

---

## 4. MCP Client Configuration Example

### Claude Desktop (`claude_desktop_config.json`)
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
