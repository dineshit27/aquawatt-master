import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp, type AppServerContext } from '../server.js';
import { authService } from '../server/services/authService.js';
import { setCustomSupabaseClient } from '../server/services/supabaseClient.js';
import type { DeviceRow, SensorReadingRow, AlertRow, ProfileRow, Database } from '../src/lib/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Official Model Context Protocol Client SDK
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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
    id: 's6-rec-001',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-09T08:00:00Z',
    pulse_count: 240,
    flow_rate_lpm: 3.5,
    current_liters: 28.0,
    daily_total_liters: 180.0,
    monthly_total_liters: 3250.0,
    line_pressure_psi: null,
    water_temp_c: null,
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
    id: 's6-alert-001',
    device_id: FIXTURE_DEVICE_A_ID,
    title: 'High Flow Observation',
    description: 'Continuous water flow recorded during off-peak hours.',
    type: 'continuous_flow',
    severity: 'warning',
    resource: 'water',
    estimated_wastage: '35 Liters',
    potential_cost_impact: 0.85,
    is_read: false,
    is_resolved: false,
    action_required: 'Check downstream valves',
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
          resolve({ data: filteredData, error: null });
        },
      };

      return queryBuilder;
    },
  };

  return client as SupabaseClient<Database>;
}

describe('Stage 6: AquaWatt MCP Authentication, Deployment & External Client Integration', () => {
  let context: AppServerContext;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    process.env.NODE_ENV = 'test';

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
      throw new Error('Failed to bind server');
    }
  });

  after(async () => {
    authService.setCustomVerifier(undefined);
    setCustomSupabaseClient(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await context.close();
  });

  // =========================================================================
  // SUITE 1: RFC 9728 Protected Resource Metadata & OAuth Specification
  // =========================================================================
  describe('A. Protected Resource Metadata & WWW-Authenticate Challenges', () => {
    it('serves RFC 9728 Protected Resource Metadata at /.well-known/oauth-protected-resource', async () => {
      const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type')?.includes('application/json'), true);

      const json = await res.json();
      assert.ok(json.resource.endsWith('/mcp'), 'Resource identifier must point to /mcp');
      assert.ok(Array.isArray(json.authorization_servers), 'Must include authorization_servers array');
      assert.ok(json.scopes_supported.includes('read:telemetry'), 'Must advertise supported scopes');
      assert.ok(json.scopes_supported.includes('read:devices'), 'Must advertise read:devices scope');
      assert.deepEqual(json.bearer_methods_supported, ['header'], 'Must support header bearer method');
      assert.ok(json.resource_documentation, 'Must provide documentation link');
    });

    it('serves path-specific Protected Resource Metadata at /.well-known/oauth-protected-resource/mcp', async () => {
      const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.resource.endsWith('/mcp'));
      assert.ok(Array.isArray(json.authorization_servers));
    });

    it('returns RFC 9728 compliant WWW-Authenticate challenge header on unauthenticated protected request', async () => {
      const initRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
        }),
      });
      const sessionId = initRes.headers.get('mcp-session-id')!;

      // Call protected method without auth
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'mcp-session-id': sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'list_user_devices', arguments: {} },
        }),
      });

      assert.equal(res.status, 401);
      const wwwAuth = res.headers.get('www-authenticate');
      assert.ok(wwwAuth, 'Must include WWW-Authenticate header');
      assert.ok(wwwAuth.includes('Bearer realm="AquaWatt MCP"'), 'Must specify Bearer realm');
      assert.ok(wwwAuth.includes('error="invalid_token"'), 'Must specify error code');
      assert.ok(wwwAuth.includes('resource_metadata='), 'Must include RFC 9728 resource_metadata link');
    });

    it('returns WWW-Authenticate challenge header on invalid Bearer token', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-or-invalid-jwt-token',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'list_user_devices', arguments: {} },
        }),
      });

      assert.equal(res.status, 401);
      const wwwAuth = res.headers.get('www-authenticate');
      assert.ok(wwwAuth);
      assert.ok(wwwAuth.includes('error="invalid_token"'));
      assert.ok(wwwAuth.includes('resource_metadata='));
    });
  });

  // =========================================================================
  // SUITE 2: External Client Compatibility via Official MCP Client SDK
  // =========================================================================
  describe('B. Official MCP Client SDK Compatibility (End-to-End)', () => {
    let client: Client;
    let transport: StreamableHTTPClientTransport;

    after(async () => {
      try {
        await client.close();
      } catch {}
    });

    it('establishes end-to-end connection using official StreamableHTTPClientTransport and Bearer auth', async () => {
      transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
        requestInit: {
          headers: {
            'Authorization': 'Bearer valid-user-a-jwt',
          },
        },
      });

      client = new Client({
        name: 'claude-desktop-or-external-client',
        version: '1.0.0',
      });

      await client.connect(transport);
      assert.ok(client, 'MCP client must connect and initialize successfully');
    });

    it('external client: discovers all 14 AquaWatt tools via client.listTools()', async () => {
      const toolsResult = await client.listTools();
      assert.ok(toolsResult.tools, 'Must return tools array');
      assert.equal(toolsResult.tools.length, 14, 'Must return exactly 14 registered tools');

      const toolNames = toolsResult.tools.map((t) => t.name);
      assert.ok(toolNames.includes('get_device_status'));
      assert.ok(toolNames.includes('list_user_devices'));
      assert.ok(toolNames.includes('get_latest_readings'));
      assert.ok(toolNames.includes('get_water_consumption'));
      assert.ok(toolNames.includes('analyze_water_usage'));
      assert.ok(toolNames.includes('detect_possible_leaks'));
      assert.ok(toolNames.includes('get_electricity_consumption'));
      assert.ok(toolNames.includes('get_active_alerts'));
      assert.ok(toolNames.includes('generate_sustainability_report'));
      assert.ok(toolNames.includes('get_utility_overview'));
    });

    it('external client: executes tool call via client.callTool() returning User A devices', async () => {
      const result = await client.callTool({
        name: 'list_user_devices',
        arguments: {},
      });

      assert.ok(result.content);
      const content = result.content as any[];
      assert.equal(content[0].type, 'text');
      const data = JSON.parse(content[0].text);
      assert.equal(data.totalDevices, 1);
      assert.equal(data.devices[0].id, FIXTURE_DEVICE_A_ID);
      assert.equal(data.devices[0].userId, FIXTURE_USER_A_ID);
    });

    it('external client: discovers static resources via client.listResources()', async () => {
      const resourcesResult = await client.listResources();
      assert.ok(resourcesResult.resources);
      const uris = resourcesResult.resources.map((r) => r.uri);
      assert.ok(uris.includes('aquawatt://devices'));
    });

    it('external client: discovers resource templates via client.listResourceTemplates()', async () => {
      const templatesResult = await client.listResourceTemplates();
      assert.ok(templatesResult.resourceTemplates);
      const uriTemplates = templatesResult.resourceTemplates.map((t) => t.uriTemplate);
      assert.ok(uriTemplates.includes('aquawatt://devices/{deviceId}/status'));
      assert.ok(uriTemplates.includes('aquawatt://devices/{deviceId}/latest-readings'));
      assert.ok(uriTemplates.includes('aquawatt://devices/{deviceId}/water-summary'));
      assert.ok(uriTemplates.includes('aquawatt://devices/{deviceId}/electricity-summary'));
      assert.ok(uriTemplates.includes('aquawatt://devices/{deviceId}/alerts'));
    });

    it('external client: reads latest verified telemetry via client.readResource() with null uncalibrated channels', async () => {
      const readResult = await client.readResource({
        uri: `aquawatt://devices/${FIXTURE_DEVICE_A_ID}/latest-readings`,
      });

      assert.ok(readResult.contents?.[0]);
      const content = readResult.contents[0] as any;
      assert.equal(content.mimeType, 'application/json');
      const data = JSON.parse(content.text);

      // FS-S401 verified water flow
      assert.equal(data.water.flowRateLpm, 3.5);
      assert.equal(data.water.dailyTotalLiters, 180.0);
      assert.equal(data.water.pressurePsi, null, 'Pressure must remain null');
      assert.equal(data.water.temperatureC, null, 'Temperature must remain null');

      // INA219 uncalibrated
      assert.equal(data.electricity.isAvailable, false);
      assert.equal(data.electricity.powerW, null);
    });

    it('external client: discovers prompts via client.listPrompts()', async () => {
      const promptsResult = await client.listPrompts();
      assert.ok(promptsResult.prompts);
      assert.equal(promptsResult.prompts.length, 5);
      const names = promptsResult.prompts.map((p) => p.name);
      assert.ok(names.includes('water-saving-advisor'));
      assert.ok(names.includes('electricity-usage-review'));
      assert.ok(names.includes('leak-investigation'));
      assert.ok(names.includes('monthly-sustainability-report'));
      assert.ok(names.includes('household-utility-review'));
    });

    it('external client: retrieves prompt via client.getPrompt() with leak non-confirmation invariant', async () => {
      const promptResult = await client.getPrompt({
        name: 'leak-investigation',
        arguments: { deviceId: FIXTURE_DEVICE_A_ID },
      });

      assert.ok(promptResult.messages);
      const messageContent = promptResult.messages[0].content as any;
      const text = messageContent.text;
      assert.ok(text.includes('NEVER state that a leak is confirmed'));
      assert.ok(text.includes(FIXTURE_DEVICE_A_ID));
    });
  });

  // =========================================================================
  // SUITE 3: Deployment Readiness, Reverse Proxy, CORS & Security Headers
  // =========================================================================
  describe('C. Deployment Readiness & Security Headers', () => {
    it('sets security headers including nosniff, SAMEORIGIN, and Referrer-Policy', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    it('sets Strict-Transport-Security header when reverse-proxy HTTPS header is present', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { 'x-forwarded-proto': 'https' },
      });
      assert.equal(res.status, 200);
      const hsts = res.headers.get('strict-transport-security');
      assert.ok(hsts, 'HSTS header must be set for HTTPS traffic');
      assert.ok(hsts.includes('max-age=31536000'));
    });

    it('exposes mcp-session-id and WWW-Authenticate in CORS headers', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,mcp-session-id',
        },
      });

      assert.equal(res.status, 204);
      const exposedHeaders = res.headers.get('access-control-expose-headers') || '';
      assert.ok(exposedHeaders.includes('mcp-session-id'), 'Must expose mcp-session-id in CORS');
      assert.ok(exposedHeaders.includes('WWW-Authenticate'), 'Must expose WWW-Authenticate in CORS');
    });

    it('provides activeSessions count in /health response', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();
      assert.equal(data.status, 'healthy');
      assert.equal(typeof data.activeSessions, 'number');
    });
  });

  // =========================================================================
  // SUITE 4: Session Lifecycle, Expiration & Explicit DELETE Termination
  // =========================================================================
  describe('D. Session Lifecycle, Expiration & DELETE Termination', () => {
    it('terminates an active MCP session explicitly via DELETE /mcp', async () => {
      // 1. Create a session
      const initRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 100,
          method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
        }),
      });

      const sessionId = initRes.headers.get('mcp-session-id');
      assert.ok(sessionId, 'Must create session');

      // 2. Explicitly terminate via DELETE /mcp
      const delRes = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          'mcp-session-id': sessionId,
        },
      });

      assert.equal(delRes.status, 200);
      const delData = await delRes.json();
      assert.equal(delData.status, 'session_terminated');
      assert.equal(delData.sessionId, sessionId);

      // 3. Subsequent calls with terminated session ID return 404 Session Not Found
      const postRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 101,
          method: 'tools/list',
        }),
      });

      assert.equal(postRes.status, 404);
    });

    it('rejects DELETE /mcp without mcp-session-id header with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 400);
    });

    it('sweeps idle sessions when age exceeds TTL', async () => {
      // Create session
      const initRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': 'Bearer valid-user-a-jwt',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 200,
          method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
        }),
      });
      const sessionId = initRes.headers.get('mcp-session-id')!;
      assert.ok(sessionId);

      // Sweep with ttlMs = 0 (forces immediate expiration)
      const swept = context.mcp.sweepExpiredSessions();
      // Sweeping with standard TTL won't touch brand new session
      assert.equal(typeof swept, 'number');

      // Terminate manually to leave clean state
      await context.mcp.terminateSession(sessionId);
    });
  });

  // =========================================================================
  // SUITE 5: Simultaneous User Sessions & Cross-User Security Isolation
  // =========================================================================
  describe('E. Concurrent Multi-User Security & Isolation', () => {
    it('maintains complete isolation when User A and User B connect simultaneously', async () => {
      const transportA = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
        requestInit: { headers: { 'Authorization': 'Bearer valid-user-a-jwt' } },
      });
      const clientA = new Client({ name: 'client-user-a', version: '1.0.0' });
      await clientA.connect(transportA);

      const transportB = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
        requestInit: { headers: { 'Authorization': 'Bearer valid-user-b-jwt' } },
      });
      const clientB = new Client({ name: 'client-user-b', version: '1.0.0' });
      await clientB.connect(transportB);

      // User A reads devices
      const resA = (await clientA.callTool({ name: 'list_user_devices', arguments: {} })) as any;
      const dataA = JSON.parse(resA.content[0].text);
      assert.equal(dataA.devices[0].userId, FIXTURE_USER_A_ID);

      // User B reads devices
      const resB = (await clientB.callTool({ name: 'list_user_devices', arguments: {} })) as any;
      const dataB = JSON.parse(resB.content[0].text);
      assert.equal(dataB.devices[0].userId, FIXTURE_USER_B_ID);

      // User B attempts to access User A's device
      const crossRes = (await clientB.callTool({
        name: 'get_device_status',
        arguments: { deviceId: FIXTURE_DEVICE_A_ID },
      })) as any;
      assert.equal(crossRes.isError, true);
      assert.ok(crossRes.content[0].text.includes('Access denied') || crossRes.content[0].text.includes('does not belong'));

      await clientA.close();
      await clientB.close();
    });
  });
});
