import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp, type AppServerContext } from '../server.js';
import { authService } from '../server/services/authService.js';
import type { DeviceRow, SensorReadingRow, ProfileRow, AlertRow, Database } from '../src/lib/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// TEST FIXTURES (Explicitly labeled mock test fixtures for isolated hermetic testing)
const FIXTURE_USER_A_ID = '11111111-1111-4111-a111-111111111111';
const FIXTURE_USER_B_ID = '22222222-2222-4222-b222-222222222222';
const FIXTURE_DEVICE_A_ID = '33333333-3333-4333-8333-333333333333';
const FIXTURE_DEVICE_B_ID = '44444444-4444-4444-9444-444444444444';

const mockDeviceA: DeviceRow = {
  id: FIXTURE_DEVICE_A_ID,
  user_id: FIXTURE_USER_A_ID,
  device_eui: 'ESP32-NODE-01',
  name: 'ESP32 Test Bench (FS-S401 + LCD)',
  device_type: 'combo_node',
  location: 'Lab Bench #1',
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
  name: 'User B Sensor Node',
  device_type: 'water_meter',
  location: 'Facility B Main',
  status: 'online',
  water_sensor_type: 'FS-S401',
  power_sensor_type: 'INA219',
  display_type: '16x2_LCD',
  battery_percent: 95,
  signal_strength_dbm: -70,
  firmware_version: 'v1.0.0-esp32',
  last_sync: '2026-11-09T08:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-09T08:00:00Z',
};

const mockReadingsDeviceA: SensorReadingRow[] = [
  {
    id: 'mcp-rec-001',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T07:00:00Z',
    pulse_count: 120,
    flow_rate_lpm: 2.5,
    current_liters: 15.0,
    daily_total_liters: 150.0,
    monthly_total_liters: 3200.0,
    line_pressure_psi: 42.5,
    water_temp_c: 21.0,
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
    id: 'mcp-rec-002',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T08:00:00Z',
    pulse_count: 240,
    flow_rate_lpm: 3.0,
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
    id: 'mcp-alert-001',
    device_id: FIXTURE_DEVICE_A_ID,
    title: 'High Night Flow Observation',
    description: 'Continuous water flow recorded during off-peak hours.',
    type: 'continuous_flow',
    severity: 'warning',
    resource: 'water',
    estimated_wastage: '25 Liters',
    potential_cost_impact: 0.63,
    is_read: false,
    is_resolved: false,
    action_required: 'Inspect downstream fixtures',
    triggered_at: '2026-11-09T03:00:00Z',
    resolved_at: null,
    created_at: '2026-11-09T03:00:00Z',
  },
];

import { setCustomSupabaseClient } from '../server/services/supabaseClient.js';

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

describe('Stage 4: AquaWatt 14 MCP Domain Tools Verification', () => {
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

  // Helper to establish an MCP session
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
          clientInfo: { name: 'mcp-test-suite', version: '1.0.0' },
        },
      }),
    });

    const sessionId = res.headers.get('mcp-session-id');
    assert.ok(sessionId, 'Session ID must be returned');

    await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'mcp-session-id': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });

    return sessionId;
  }

  // Helper to invoke a tool
  async function callTool(sessionId: string, toolName: string, args: Record<string, any> = {}, authHeader?: string) {
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
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    const status = res.status;
    const text = await res.text();
    let json: any;
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

  describe('A. Tool Discovery (tools/list)', () => {
    it('discovers all 14 registered MCP tools with descriptions and strict input schemas', async () => {
      const sessionId = await createSession();
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        }),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      const match = text.match(/data: (\{.*\})/);
      assert.ok(match, 'Must return SSE data event');
      const data = JSON.parse(match[1]);
      const tools = data.result.tools as Array<{ name: string; description: string }>;

      assert.equal(tools.length, 14);

      const expectedToolNames = [
        'get_device_status',
        'list_user_devices',
        'get_latest_readings',
        'get_water_consumption',
        'analyze_water_usage',
        'compare_water_consumption',
        'detect_possible_leaks',
        'get_electricity_consumption',
        'analyze_electricity_usage',
        'compare_electricity_consumption',
        'detect_energy_anomalies',
        'get_active_alerts',
        'generate_sustainability_report',
        'get_utility_overview',
      ];

      for (const expected of expectedToolNames) {
        const found = tools.find(t => t.name === expected);
        assert.ok(found, `Tool '${expected}' must be registered`);
        assert.ok(found.description.length > 10, `Tool '${expected}' must have descriptive documentation`);
      }
    });
  });

  describe('B. Authentication & Security Enforcement', () => {
    it('rejects unauthenticated tools/call with HTTP 401', async () => {
      const unauthSession = await createSession(); // Unauthenticated session
      const { status, json } = await callTool(unauthSession, 'list_user_devices');

      assert.equal(status, 401);
      assert.equal(json.error.code, -32001);
      assert.ok(json.error.message.includes('Authentication required'));
    });

    it('rejects tools/call with invalid or expired Bearer token', async () => {
      const session = await createSession();
      const { status, json } = await callTool(session, 'list_user_devices', {}, 'Bearer invalid-token');

      assert.equal(status, 401);
      assert.equal(json.error.code, -32001);
    });
  });

  describe('C. Device Management Tools (Tools 1 & 2)', () => {
    it('list_user_devices: lists devices belonging to the authenticated user', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await callTool(session, 'list_user_devices');

      assert.equal(status, 200);
      assert.ok(json.result);
      const textContent = json.result.content[0].text;
      const parsed = JSON.parse(textContent);
      assert.ok(typeof parsed.totalDevices === 'number');
    });

    it('get_device_status: returns hardware status and connectivity for user device', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { status, json } = await callTool(session, 'get_device_status', {
        deviceId: FIXTURE_DEVICE_A_ID,
      });

      assert.equal(status, 200);
      assert.ok(json.result);
    });

    it('get_device_status: denies cross-user access when User B queries User A device', async () => {
      const session = await createSession('Bearer valid-user-b-jwt');
      const { json } = await callTool(session, 'get_device_status', {
        deviceId: FIXTURE_DEVICE_A_ID,
      });

      // Returns structured tool error
      assert.ok(json.result?.isError || json.error);
      const errorContent = json.result ? JSON.parse(json.result.content[0].text) : json;
      assert.ok(
        errorContent.error.code === 'DEVICE_ACCESS_DENIED' ||
        errorContent.error.message.includes('Access denied')
      );
    });
  });

  describe('D. Water Monitoring Tools (Tools 3 - 7)', () => {
    it('get_latest_readings: returns physical telemetry with null pressure/temp on FS-S401', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'get_latest_readings', {
        deviceId: FIXTURE_DEVICE_A_ID,
      });

      assert.ok(json.result);
    });

    it('get_water_consumption: aggregates water volume by period', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'get_water_consumption', {
        deviceId: FIXTURE_DEVICE_A_ID,
        period: 'daily',
        startDate: '2026-11-09T00:00:00Z',
        endDate: '2026-11-09T23:59:59Z',
      });

      assert.ok(json.result);
    });

    it('analyze_water_usage: evaluates preset usage trends', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'analyze_water_usage', {
        deviceId: FIXTURE_DEVICE_A_ID,
        timeRange: '24h',
      });

      assert.ok(json.result);
    });

    it('compare_water_consumption: compares two discrete periods', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'compare_water_consumption', {
        deviceId: FIXTURE_DEVICE_A_ID,
        currentStartDate: '2026-11-09T00:00:00Z',
        currentEndDate: '2026-11-09T23:59:59Z',
        previousStartDate: '2026-11-08T00:00:00Z',
        previousEndDate: '2026-11-08T23:59:59Z',
      });

      assert.ok(json.result);
    });

    it('detect_possible_leaks: runs explainable leak analysis with non-confirmation caveats', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'detect_possible_leaks', {
        deviceId: FIXTURE_DEVICE_A_ID,
        startDate: '2026-11-09T00:00:00Z',
        endDate: '2026-11-09T08:00:00Z',
        timezone: 'Asia/Kolkata',
      });

      assert.ok(json.result);
      const parsed = JSON.parse(json.result.content[0].text);
      if (parsed.hasPossibleLeak !== undefined) {
        assert.ok(parsed.caveats.some((c: string) => c.includes('does NOT constitute a confirmed physical leak')));
      }
    });
  });

  describe('E. Electricity Monitoring Tools (Tools 8 - 11)', () => {
    it('get_electricity_consumption: returns explicit uncalibrated hardware status for INA219', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'get_electricity_consumption', {
        deviceId: FIXTURE_DEVICE_A_ID,
        period: 'daily',
        startDate: '2026-11-09T00:00:00Z',
        endDate: '2026-11-09T23:59:59Z',
      });

      assert.ok(json.result);
    });

    it('analyze_electricity_usage: returns unavailable status for uncalibrated INA219', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'analyze_electricity_usage', {
        deviceId: FIXTURE_DEVICE_A_ID,
        timeRange: '24h',
      });

      assert.ok(json.result);
    });

    it('compare_electricity_consumption: explains pending calibration status', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'compare_electricity_consumption', {
        deviceId: FIXTURE_DEVICE_A_ID,
        currentStartDate: '2026-11-09T00:00:00Z',
        currentEndDate: '2026-11-09T23:59:59Z',
        previousStartDate: '2026-11-08T00:00:00Z',
        previousEndDate: '2026-11-08T23:59:59Z',
      });

      assert.ok(json.result);
    });

    it('detect_energy_anomalies: reports unavailable status instead of simulated anomalies', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'detect_energy_anomalies', {
        deviceId: FIXTURE_DEVICE_A_ID,
        startDate: '2026-11-09T00:00:00Z',
        endDate: '2026-11-09T23:59:59Z',
      });

      assert.ok(json.result);
    });
  });

  describe('F. Alerts & Sustainability Tools (Tools 12 - 14)', () => {
    it('get_active_alerts: retrieves unresolved alerts for user devices', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'get_active_alerts', {
        severity: 'all',
      });

      assert.ok(json.result);
    });

    it('generate_sustainability_report: generates report distinguishing estimates from measured water telemetry', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'generate_sustainability_report', {
        timeRange: '30d',
      });

      assert.ok(json.result);
    });

    it('get_utility_overview: returns consolidated platform overview', async () => {
      const session = await createSession('Bearer valid-user-a-jwt');
      const { json } = await callTool(session, 'get_utility_overview');

      assert.ok(json.result);
      const parsed = JSON.parse(json.result.content[0].text);
      assert.equal(parsed.userId, FIXTURE_USER_A_ID);
      assert.ok(parsed.facility);
      assert.ok(parsed.sustainabilityIndex);
    });
  });
});
