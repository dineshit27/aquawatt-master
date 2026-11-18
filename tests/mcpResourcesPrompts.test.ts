import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp, type AppServerContext } from '../server.js';
import { authService } from '../server/services/authService.js';
import { setCustomSupabaseClient } from '../server/services/supabaseClient.js';
import type { DeviceRow, SensorReadingRow, AlertRow, ProfileRow, Database } from '../src/lib/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// RFC 4122 v4 UUID fixtures
const FIXTURE_USER_A_ID = '11111111-1111-4111-a111-111111111111';
const FIXTURE_USER_B_ID = '22222222-2222-4222-b222-222222222222';
const FIXTURE_DEVICE_A_ID = '33333333-3333-4333-8333-333333333333';
const FIXTURE_DEVICE_B_ID = '44444444-4444-4444-9444-444444444444';

const mockDeviceA: DeviceRow = {
  id: FIXTURE_DEVICE_A_ID,
  user_id: FIXTURE_USER_A_ID,
  device_eui: 'ESP32-NODE-01',
  name: 'ESP32 Flow Lab (FS-S401 + LCD)',
  device_type: 'combo_node',
  location: 'Lab Station #1',
  status: 'online',
  water_sensor_type: 'FS-S401',
  power_sensor_type: 'INA219',
  display_type: '16x2_LCD',
  battery_percent: 100,
  signal_strength_dbm: -64,
  firmware_version: 'v1.0.0-esp32',
  last_sync: '2026-11-09T08:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-09T08:00:00Z',
};

const mockDeviceB: DeviceRow = {
  id: FIXTURE_DEVICE_B_ID,
  user_id: FIXTURE_USER_B_ID,
  device_eui: 'ESP32-NODE-02',
  name: 'User B Facility Node',
  device_type: 'water_meter',
  location: 'Facility B Main',
  status: 'online',
  water_sensor_type: 'FS-S401',
  power_sensor_type: 'INA219',
  display_type: '16x2_LCD',
  battery_percent: 92,
  signal_strength_dbm: -72,
  firmware_version: 'v1.0.0-esp32',
  last_sync: '2026-11-09T08:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-09T08:00:00Z',
};

const mockReadingsDeviceA: SensorReadingRow[] = [
  {
    id: 'res-rec-001',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T07:00:00Z',
    pulse_count: 120,
    flow_rate_lpm: 2.5,
    current_liters: 15.0,
    daily_total_liters: 150.0,
    monthly_total_liters: 3200.0,
    line_pressure_psi: 42.5, // raw untested
    water_temp_c: 21.0,      // raw untested
    voltage_v: null,
    current_a: null,
    power_w: null,
    active_power_kw: null,
    daily_total_kwh: null,
    monthly_total_kwh: null,
    power_factor: null,
    sensor_notes: 'FS-S401 Active · INA219 Pending Hardware Calibration',
    created_at: '2026-11-09T07:00:00Z',
  },
  {
    id: 'res-rec-002',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T08:00:00Z',
    pulse_count: 240,
    flow_rate_lpm: 3.2,
    current_liters: 25.0,
    daily_total_liters: 175.0,
    monthly_total_liters: 3225.0,
    line_pressure_psi: 43.0,
    water_temp_c: 21.5,
    voltage_v: null,
    current_a: null,
    power_w: null,
    active_power_kw: null,
    daily_total_kwh: null,
    monthly_total_kwh: null,
    power_factor: null,
    sensor_notes: 'FS-S401 Active · INA219 Pending Hardware Calibration',
    created_at: '2026-11-09T08:00:00Z',
  },
];

const mockAlerts: AlertRow[] = [
  {
    id: 'res-alert-001',
    device_id: FIXTURE_DEVICE_A_ID,
    title: 'High Night Flow Observation',
    description: 'Continuous water flow recorded during off-peak hours.',
    type: 'continuous_flow',
    severity: 'warning',
    resource: 'water',
    estimated_wastage: '30 Liters',
    potential_cost_impact: 0.75,
    is_read: false,
    is_resolved: false,
    action_required: 'Check downstream valves and fixtures',
    triggered_at: '2026-11-09T03:00:00Z',
    resolved_at: null,
    created_at: '2026-11-09T03:00:00Z',
  },
];

function createMockSupabaseClient(): SupabaseClient<Database> {
  const devices = [mockDeviceA, mockDeviceB];
  const readings = mockReadingsDeviceA;
  const alerts = mockAlerts;
  const profiles = [
    {
      id: FIXTURE_USER_A_ID,
      email: 'user-a@aquawatt.io',
      full_name: 'User A',
      facility_name: 'Main Campus Lab',
      facility_address: '100 Eco Boulevard',
      facility_timezone: 'Asia/Kolkata',
      water_rate_per_m3: 1.25,
      electricity_rate_per_kwh: 0.14,
      currency: 'USD',
      preferred_units: 'metric',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-09T00:00:00Z',
    },
  ];

  const client: any = {
    from: (table: string) => {
      let filteredData: any[] = [];
      if (table === 'devices') filteredData = [...devices];
      else if (table === 'sensor_readings') filteredData = [...readings];
      else if (table === 'alerts') filteredData = [...alerts];
      else if (table === 'profiles') filteredData = [...profiles];

      const queryBuilder: any = {
        select: (_cols?: string) => queryBuilder,
        eq: (col: string, val: any) => {
          filteredData = filteredData.filter((item) => item[col] === val);
          return queryBuilder;
        },
        in: (col: string, vals: any[]) => {
          filteredData = filteredData.filter((item) => vals.includes(item[col]));
          return queryBuilder;
        },
        gte: (col: string, val: any) => {
          filteredData = filteredData.filter((item) => item[col] >= val);
          return queryBuilder;
        },
        lte: (col: string, val: any) => {
          filteredData = filteredData.filter((item) => item[col] <= val);
          return queryBuilder;
        },
        order: (col: string, opt?: { ascending?: boolean }) => {
          const asc = opt?.ascending ?? true;
          filteredData.sort((a, b) => {
            if (a[col] < b[col]) return asc ? -1 : 1;
            if (a[col] > b[col]) return asc ? 1 : -1;
            return 0;
          });
          return queryBuilder;
        },
        limit: (n: number) => {
          filteredData = filteredData.slice(0, n);
          return queryBuilder;
        },
        maybeSingle: async () => ({
          data: filteredData[0] || null,
          error: null,
        }),
        then: (resolve: any) => {
          resolve({ data: filteredData, error: null });
        },
      };

      return queryBuilder;
    },
  };

  return client as SupabaseClient<Database>;
}

describe('Stage 5: AquaWatt MCP Resources & Reusable Prompts Verification', () => {
  let context: AppServerContext;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    process.env.NODE_ENV = 'test';

    // Mock token verification for test runner
    authService.setCustomVerifier(async (token: string) => {
      if (token === 'valid-user-a-jwt') {
        return { id: FIXTURE_USER_A_ID, email: 'user-a@aquawatt.io', role: 'authenticated' };
      }
      if (token === 'valid-user-b-jwt') {
        return { id: FIXTURE_USER_B_ID, email: 'user-b@aquawatt.io', role: 'authenticated' };
      }
      return null;
    });

    setCustomSupabaseClient(createMockSupabaseClient());

    context = await createApp({ disableVite: true });
    server = context.app.listen(0);
    const address = server.address();
    if (address && typeof address === 'object') {
      baseUrl = `http://localhost:${address.port}`;
    } else {
      throw new Error('Unable to bind test server');
    }
  });

  after(async () => {
    authService.setCustomVerifier(undefined);
    setCustomSupabaseClient(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await context.close();
  });

  // Helper to establish an MCP Streamable HTTP session
  async function createSession(authHeader?: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'mcp-stage5-test-suite', version: '1.0.0' },
        },
      }),
    });

    const sessionId = res.headers.get('mcp-session-id');
    assert.ok(sessionId, 'Session ID must be returned on initialize');

    await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'mcp-session-id': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });

    return sessionId;
  }

  // Helper to read an MCP resource
  async function readResource(sessionId: string, uri: string, authHeader?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/read',
        params: { uri },
      }),
    });

    const status = res.status;
    const text = await res.text();
    let json: any = null;
    const match = text.match(/data: (\{.*\})/);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }
    return { status, text, json };
  }

  // Helper to execute an MCP prompt
  async function getPrompt(sessionId: string, promptName: string, args: Record<string, any> = {}, authHeader?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'prompts/get',
        params: {
          name: promptName,
          arguments: args,
        },
      }),
    });

    const status = res.status;
    const text = await res.text();
    let json: any = null;
    const match = text.match(/data: (\{.*\})/);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }
    return { status, text, json };
  }

  // =========================================================================
  // SUITE 1: Resource Discovery (resources/list & resources/templates/list)
  // =========================================================================
  describe('A. Resource Discovery', () => {
    it('discovers static resources via resources/list', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': session,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'resources/list' }),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      const match = text.match(/data: (\{.*\})/);
      assert.ok(match, 'Must return SSE data event');
      const json = JSON.parse(match[1]);
      assert.ok(json.result?.resources);

      const uris = json.result.resources.map((r: any) => r.uri);
      assert.ok(uris.includes('aquawatt://devices'), 'Must include static aquawatt://devices resource');
    });

    it('discovers all five resource templates via resources/templates/list', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': session,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'resources/templates/list' }),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      const match = text.match(/data: (\{.*\})/);
      assert.ok(match, 'Must return SSE data event');
      const json = JSON.parse(match[1]);
      assert.ok(json.result?.resourceTemplates);

      const templates = json.result.resourceTemplates.map((t: any) => t.uriTemplate);
      assert.ok(templates.includes('aquawatt://devices/{deviceId}/status'));
      assert.ok(templates.includes('aquawatt://devices/{deviceId}/latest-readings'));
      assert.ok(templates.includes('aquawatt://devices/{deviceId}/water-summary'));
      assert.ok(templates.includes('aquawatt://devices/{deviceId}/electricity-summary'));
      assert.ok(templates.includes('aquawatt://devices/{deviceId}/alerts'));
    });
  });

  // =========================================================================
  // SUITE 2: Resource Security, Authentication & Cross-User Denial
  // =========================================================================
  describe('B. Resource Security & Access Control', () => {
    it('rejects unauthenticated resource read with HTTP 401', async () => {
      const unauthSession = await createSession(); // Unauthenticated session
      const { status, json } = await readResource(unauthSession, 'aquawatt://devices');

      assert.equal(status, 401);
      assert.equal(json.error.code, -32001);
      assert.ok(json.error.message.includes('Authentication required'));
    });

    it('rejects resource read with invalid Bearer token', async () => {
      const session = await createSession();
      const { status, json } = await readResource(session, 'aquawatt://devices', 'Bearer invalid-token');

      assert.equal(status, 401);
      assert.equal(json.error.code, -32001);
    });

    it('rejects invalid deviceId parameter with parameter validation error', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await readResource(session, 'aquawatt://devices/not-a-valid-uuid/status');

      assert.ok(json.error);
      assert.ok(json.error.message.includes('not a valid UUID'));
    });

    it('denies cross-user resource read when User B attempts to access User A device status', async () => {
      const session = await createSession('Bearer valid-user-b-jwt');
      const { json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/status`);

      assert.ok(json.error);
      assert.ok(json.error.message.includes('Access denied') || json.error.message.includes('does not belong'));
    });

    it('denies cross-user resource read when User B attempts to access User A water summary', async () => {
      const session = await createSession('Bearer valid-user-b-jwt');
      const { json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/water-summary`);

      assert.ok(json.error);
      assert.ok(json.error.message.includes('Access denied') || json.error.message.includes('does not belong'));
    });
  });

  // =========================================================================
  // SUITE 3: Reading Each of the Six Resources
  // =========================================================================
  describe('C. Reading All Six Resources', () => {
    it('1. aquawatt://devices: returns user-owned devices with hardware availability', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, 'aquawatt://devices');

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      assert.equal(json.result.contents[0].mimeType, 'application/json');

      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(typeof data.totalDevices, 'number');
      assert.ok(data.devices.some((d: any) => d.id === FIXTURE_DEVICE_A_ID));
      assert.ok(data.devices[0].hardwareAvailability.waterSensor.includes('FS-S401'));
      assert.ok(data.devices[0].hardwareAvailability.electricalSensor.includes('INA219'));
    });

    it('2. aquawatt://devices/{deviceId}/status: returns operational connectivity and hardware details', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/status`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_A_ID);
      assert.equal(data.status, 'online');
      assert.ok(data.hardwareStatus.waterSensor.includes('FS-S401'));
    });

    it('3. aquawatt://devices/{deviceId}/latest-readings: returns verified telemetry and preserves null unverified channels', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/latest-readings`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);

      // Verified water flow reading
      assert.equal(data.water.flowRateLpm, 3.2);
      assert.equal(data.water.dailyTotalLiters, 175.0);

      // Unverified physical channels MUST remain null
      assert.equal(data.water.pressurePsi, null, 'pressurePsi must remain null in physical mode');
      assert.equal(data.water.temperatureC, null, 'temperatureC must remain null in physical mode');
      assert.ok(data.water.pressureStatusNote.includes('unverified'));

      // INA219 uncalibrated readings MUST remain null
      assert.equal(data.electricity.isAvailable, false);
      assert.equal(data.electricity.voltageV, null);
      assert.equal(data.electricity.currentA, null);
      assert.equal(data.electricity.powerW, null);
      assert.equal(data.electricity.dailyTotalKwh, null);
    });

    it('4. aquawatt://devices/{deviceId}/water-summary: returns water consumption summaries and hardware notice', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/water-summary`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_A_ID);
      assert.equal(data.sensorModel, 'FS-S401 Turbine Flow Meter');
      assert.equal(data.telemetry.flowRateLpm, 3.2);
      assert.equal(data.telemetry.todayUsageLiters, 175.0);
      assert.ok(data.hardwareIntegrity.pulseFlowSensor.includes('Verified physical'));
    });

    it('5. aquawatt://devices/{deviceId}/electricity-summary: returns explicit pending status and calibration notes', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/electricity-summary`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_A_ID);
      assert.equal(data.hardwareStatus, 'INA219_PENDING_CALIBRATION');
      assert.equal(data.isAvailable, false);
      assert.equal(data.metrics.powerW, null);
      assert.equal(data.metrics.dailyTotalKwh, null);
      assert.ok(data.statusNote.includes('Pending Hardware Calibration'));
      assert.ok(data.calibrationNotice.includes('Simulated electrical values are strictly prohibited'));
    });

    it('6. aquawatt://devices/{deviceId}/alerts: returns active alerts for user device', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/alerts`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_A_ID);
      assert.equal(data.totalActiveAlerts, 1);
      assert.equal(data.alerts[0].type, 'continuous_flow');
    });
  });

  // =========================================================================
  // SUITE 4: Prompt Discovery and Generation (All 5 Prompts)
  // =========================================================================
  describe('D. Reusable MCP Prompts', () => {
    it('discovers all five registered prompts via prompts/list', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': session,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 20, method: 'prompts/list' }),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      const match = text.match(/data: (\{.*\})/);
      assert.ok(match, 'Must return SSE data event');
      const json = JSON.parse(match[1]);
      assert.ok(json.result?.prompts);

      const promptNames = json.result.prompts.map((p: any) => p.name);
      assert.ok(promptNames.includes('water-saving-advisor'));
      assert.ok(promptNames.includes('electricity-usage-review'));
      assert.ok(promptNames.includes('leak-investigation'));
      assert.ok(promptNames.includes('monthly-sustainability-report'));
      assert.ok(promptNames.includes('household-utility-review'));
    });

    it('1. water-saving-advisor: validates arguments and references water summary and tools', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await getPrompt(session, 'water-saving-advisor', {
        deviceId: FIXTURE_DEVICE_A_ID,
        timeRange: '7d',
      });

      assert.equal(status, 200);
      assert.ok(json.result?.messages);
      const promptText = json.result.messages[0].content.text;
      assert.ok(promptText.includes(`aquawatt://devices/${FIXTURE_DEVICE_A_ID}/water-summary`));
      assert.ok(promptText.includes('analyze_water_usage'));
      assert.ok(promptText.includes('detect_possible_leaks'));
    });

    it('2. electricity-usage-review: mandates INA219 pending calibration disclosure', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await getPrompt(session, 'electricity-usage-review', {
        deviceId: FIXTURE_DEVICE_A_ID,
      });

      assert.equal(status, 200);
      assert.ok(json.result?.messages);
      const promptText = json.result.messages[0].content.text;
      assert.ok(promptText.includes('INA219_PENDING_CALIBRATION'));
      assert.ok(promptText.includes('NEVER fabricate, hallucinate, or simulate power consumption'));
      assert.ok(promptText.includes(`aquawatt://devices/${FIXTURE_DEVICE_A_ID}/electricity-summary`));
    });

    it('3. leak-investigation: strictly enforces non-confirmation invariant', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await getPrompt(session, 'leak-investigation', {
        deviceId: FIXTURE_DEVICE_A_ID,
        timezone: 'Asia/Kolkata',
      });

      assert.equal(status, 200);
      assert.ok(json.result?.messages);
      const promptText = json.result.messages[0].content.text;
      assert.ok(promptText.includes('NEVER state that a leak is confirmed'));
      assert.ok(promptText.includes('unusual flow observation'));
      assert.ok(promptText.includes('detect_possible_leaks'));
    });

    it('4. monthly-sustainability-report: distinguishes measured water from calculated estimates', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await getPrompt(session, 'monthly-sustainability-report', {
        month: '2026-11',
      });

      assert.equal(status, 200);
      assert.ok(json.result?.messages);
      const promptText = json.result.messages[0].content.text;
      assert.ok(promptText.includes('Measured Telemetry'));
      assert.ok(promptText.includes('Calculated Estimates'));
      assert.ok(promptText.includes('generate_sustainability_report'));
    });

    it('5. household-utility-review: generates comprehensive whole-estate prompt', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await getPrompt(session, 'household-utility-review', {});

      assert.equal(status, 200);
      assert.ok(json.result?.messages);
      const promptText = json.result.messages[0].content.text;
      assert.ok(promptText.includes('aquawatt://devices'));
      assert.ok(promptText.includes('get_utility_overview'));
      assert.ok(promptText.includes('get_active_alerts'));
    });

    it('prompts/get: rejects invalid argument types with validation error', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await getPrompt(session, 'water-saving-advisor', {
        deviceId: 'invalid-non-uuid-string',
      });

      assert.ok(json.error);
      assert.equal(json.error.code, -32602);
      assert.ok(json.error.message.includes('Invalid arguments for prompt'));
    });

    it('prompts/get: denies cross-user device access when User B queries User A device', async () => {
      const session = await createSession('Bearer valid-user-b-jwt');
      const { json } = await getPrompt(session, 'water-saving-advisor', {
        deviceId: FIXTURE_DEVICE_A_ID,
      });

      assert.ok(json.error);
      assert.ok(json.error.message.includes('Access denied') || json.error.message.includes('does not belong'));
    });
  });

  // =========================================================================
  // SUITE 5: Concurrent Session Isolation
  // =========================================================================
  describe('E. Concurrent Session Isolation', () => {
    it('maintains isolated user contexts across concurrent sessions without cross-contamination', async () => {
      const sessionUserA = await createSession('Bearer valid-user-a-jwt');
      const sessionUserB = await createSession('Bearer valid-user-b-jwt');

      // User A reads user-devices
      const resA = await readResource(sessionUserA, 'aquawatt://devices');
      const dataA = JSON.parse(resA.json.result.contents[0].text);
      assert.ok(dataA.devices.every((d: any) => d.userId === FIXTURE_USER_A_ID));

      // User B reads user-devices
      const resB = await readResource(sessionUserB, 'aquawatt://devices');
      const dataB = JSON.parse(resB.json.result.contents[0].text);
      assert.ok(dataB.devices.every((d: any) => d.userId === FIXTURE_USER_B_ID));
    });
  });

  // =========================================================================
  // SUITE 6: Edge Cases & Empty Datasets
  // =========================================================================
  describe('F. Edge Cases & Empty Datasets', () => {
    it('handles device with zero sensor readings gracefully with zero/null defaults', async () => {
      // User B device (FIXTURE_DEVICE_B_ID) has no sensor readings in mock DB
      const session = await createSession('Bearer valid-user-b-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_B_ID}/latest-readings`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_B_ID);
      assert.equal(data.water.flowRateLpm, 0);
      assert.equal(data.water.dailyTotalLiters, 0);
      assert.equal(data.water.pressurePsi, null);
      assert.equal(data.water.temperatureC, null);
      assert.equal(data.electricity.isAvailable, false);
      assert.equal(data.electricity.powerW, null);
    });

    it('handles device with zero active alerts returning empty array', async () => {
      // User B device has 0 alerts in mock DB
      const session = await createSession('Bearer valid-user-b-jwt');
      const { status, json } = await readResource(session, `aquawatt://devices/${FIXTURE_DEVICE_B_ID}/alerts`);

      assert.equal(status, 200);
      assert.ok(json.result?.contents?.[0]);
      const data = JSON.parse(json.result.contents[0].text);
      assert.equal(data.deviceId, FIXTURE_DEVICE_B_ID);
      assert.equal(data.totalActiveAlerts, 0);
      assert.deepEqual(data.alerts, []);
    });
  });
});
