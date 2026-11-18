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
    id: 's7-rec-001',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T08:00:00Z',
    pulse_count: 240,
    flow_rate_lpm: 3.5,
    current_liters: 28.0,
    daily_total_liters: 180.0,
    monthly_total_liters: 3250.0,
    line_pressure_psi: null, // strictly null
    water_temp_c: null,      // strictly null
    voltage_v: null,         // strictly null (INA219 pending calibration)
    current_a: null,         // strictly null
    power_w: null,           // strictly null
    active_power_kw: null,   // strictly null
    daily_total_kwh: null,   // strictly null
    monthly_total_kwh: null, // strictly null
    power_factor: null,      // strictly null
    sensor_notes: 'FS-S401 Active · INA219 Pending Hardware Calibration',
    created_at: '2026-11-09T08:00:00Z',
  },
];

const mockAlerts: AlertRow[] = [
  {
    id: 's7-alert-001',
    device_id: FIXTURE_DEVICE_A_ID,
    title: 'Flow Observation Alert',
    description: 'Minor continuous flow observed in testing.',
    type: 'continuous_flow',
    severity: 'warning',
    resource: 'water',
    estimated_wastage: '15 Liters',
    potential_cost_impact: 0.45,
    is_read: false,
    is_resolved: false,
    action_required: 'Inspect fixture seals',
    triggered_at: '2026-11-09T04:00:00Z',
    resolved_at: null,
    created_at: '2026-11-09T04:00:00Z',
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
    {
      id: FIXTURE_USER_B_ID,
      email: 'user-b@aquawatt.io',
      full_name: 'User B',
      facility_name: 'Facility B Campus',
      facility_address: '200 Industrial Parkway',
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
          return Promise.resolve({ data: filteredData, error: null }).then(resolve);
        },
      };

      return queryBuilder;
    },
    auth: {
      getUser: async (jwt: string) => {
        if (jwt === 'valid-user-a-jwt') {
          return { data: { user: { id: FIXTURE_USER_A_ID, email: 'user-a@aquawatt.io', role: 'authenticated' } }, error: null };
        }
        if (jwt === 'valid-user-b-jwt') {
          return { data: { user: { id: FIXTURE_USER_B_ID, email: 'user-b@aquawatt.io', role: 'authenticated' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

describe('Stage 7: Built-in Dashboard AI Assistant Integration', () => {
  let serverContext: AppServerContext;
  let server: http.Server;
  let serverUrl: string;

  before(async () => {
    // Configure hermetic test verifier & client
    authService.setCustomVerifier(async (token: string) => {
      if (token === 'valid-user-a-jwt') {
        return { id: FIXTURE_USER_A_ID, email: 'user-a@aquawatt.io', role: 'authenticated' };
      }
      if (token === 'valid-user-b-jwt') {
        return { id: FIXTURE_USER_B_ID, email: 'user-b@aquawatt.io', role: 'authenticated' };
      }
      return null;
    });

    const mockClient = createMockSupabaseClient();
    setCustomSupabaseClient(mockClient);

    serverContext = await createApp({ disableVite: true });
    server = http.createServer(serverContext.app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    authService.setCustomVerifier(undefined);
    setCustomSupabaseClient(null);
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (serverContext) {
      await serverContext.close();
    }
  });

  describe('1. Authentication & Security Enforcement', () => {
    it('rejects unauthenticated request to /api/assistant/chat with HTTP 401', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello assistant' }),
      });

      assert.strictEqual(res.status, 401);
      const authHeader = res.headers.get('WWW-Authenticate');
      assert.ok(authHeader?.includes('Bearer'));
      assert.ok(authHeader?.includes('error="invalid_token"'));

      const json = await res.json();
      assert.strictEqual(json.status, 'error');
      assert.strictEqual(json.code, 'UNAUTHENTICATED');
    });

    it('rejects invalid or expired token with HTTP 401', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token-xyz',
        },
        body: JSON.stringify({ message: 'Hello assistant' }),
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.status, 'error');
      assert.strictEqual(json.code, 'INVALID_TOKEN');
    });

    it('rejects malformed request body with HTTP 400 validation error', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({ invalidField: 123 }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.status, 'error');
      assert.strictEqual(json.code, 'VALIDATION_ERROR');
    });
  });

  describe('2. Grounded Domain Services & Hardware Invariants', () => {
    it('responds to user device query and returns only User A devices', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({ message: 'List my registered devices' }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert.ok(json.reply.includes('ESP32 Flow Lab'));
      assert.ok(!json.reply.includes('User B Facility Node'));
      assert.ok(json.retrievedToolCalls.includes('list_user_devices'));
      assert.ok(Array.isArray(json.hardwareBoundaryNotes));
    });

    it('responds to water flow telemetry query with verified FS-S401 measurements', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'What is my latest water flow rate?',
          deviceId: FIXTURE_DEVICE_A_ID,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert.ok(json.reply.includes('3.5') || json.reply.includes('FS-S401'));
      assert.ok(json.retrievedToolCalls.includes('get_latest_telemetry'));
      // Hardware boundary note for water
      assert.ok(json.hardwareBoundaryNotes.some((n: string) => n.includes('FS-S401')));
    });

    it('responds to electricity questions by stating INA219 is uncalibrated and power is null', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'What is my current power draw and electricity usage?',
          deviceId: FIXTURE_DEVICE_A_ID,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      // Must clearly communicate pending calibration / unavailable
      assert.ok(
        json.reply.toLowerCase().includes('pending calibration') ||
        json.reply.toLowerCase().includes('uncalibrated') ||
        json.reply.toLowerCase().includes('ina219') ||
        json.reply.toLowerCase().includes('unmeasured')
      );
      // Hardware boundary notes must include INA219 status
      assert.ok(json.hardwareBoundaryNotes.some((n: string) => n.toLowerCase().includes('ina219') || n.toLowerCase().includes('calibration')));
    });

    it('enforces leak non-confirmation invariant (reports observations, never confirmed leaks)', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'Is there a leak in my plumbing system?',
          deviceId: FIXTURE_DEVICE_A_ID,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      // Invariant: never claim a confirmed leak
      assert.ok(!json.reply.toLowerCase().includes('confirmed leak'));
      assert.ok(
        json.reply.toLowerCase().includes('possible') ||
        json.reply.toLowerCase().includes('observation') ||
        json.reply.toLowerCase().includes('anomaly') ||
        json.reply.toLowerCase().includes('unlikely')
      );
    });

    it('generates a sustainability report grounded in actual water metrics', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'Generate a sustainability report for my facility',
          deviceId: FIXTURE_DEVICE_A_ID,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert.ok(json.retrievedToolCalls.includes('generate_sustainability_report'));
      assert.ok(json.reply.includes('Sustainability') || json.reply.includes('Score') || json.reply.includes('grade'));
    });
  });

  describe('3. Multi-User Isolation & Authorization Boundaries', () => {
    it('denies User A access to User B device with HTTP 403', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'Show telemetry for this device',
          deviceId: FIXTURE_DEVICE_B_ID, // Belongs to User B
        }),
      });

      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.status, 'error');
      assert.strictEqual(json.code, 'ACCESS_DENIED');
      assert.ok(json.message.includes('Access denied') || json.message.includes('not belong'));
    });

    it('allows User B to access their own device successfully', async () => {
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-b-jwt',
        },
        body: JSON.stringify({
          message: 'Check device status',
          deviceId: FIXTURE_DEVICE_B_ID,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert.ok(json.reply.includes('User B') || json.retrievedToolCalls.length > 0);
    });
  });

  describe('4. Graceful Offline Fallback & Deterministic Engine', () => {
    it('returns grounded responses even when GEMINI_API_KEY is not configured', async () => {
      // In this test, GEMINI_API_KEY is unconfigured, yet the assistant completes successfully
      // using the deterministic domain service dispatcher
      const res = await fetch(`${serverUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          message: 'What active alerts are there for my water meter?',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert.ok(json.reply.length > 0);
      assert.ok(json.retrievedToolCalls.includes('get_active_alerts'));
    });
  });
});
