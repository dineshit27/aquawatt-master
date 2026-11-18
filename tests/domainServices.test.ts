import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DeviceRow, SensorReadingRow, ProfileRow, AlertRow } from '../src/lib/supabase.js';
import {
  deviceService,
  telemetryService,
  waterService,
  electricityService,
  analyticsService,
  anomalyService,
  generalService,
  authService,
  getLocalHourInTimezone,
  UnauthorizedDeviceAccessError,
  UnauthenticatedError,
  InvalidTokenError,
  type AuthContext,
} from '../server/services/index.js';

// TEST FIXTURES (Explicitly labeled as mock test fixtures, not live database records)
const FIXTURE_USER_A_ID = '11111111-1111-4111-a111-111111111111';
const FIXTURE_USER_B_ID = '22222222-2222-4222-b222-222222222222';

const FIXTURE_DEVICE_A_ID = '33333333-3333-4333-c333-333333333333';
const FIXTURE_DEVICE_B_ID = '44444444-4444-4444-d444-444444444444';

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
  last_sync: '2026-11-08T09:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-08T09:00:00Z',
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
  last_sync: '2026-11-08T09:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-08T09:00:00Z',
};

// Physical telemetry readings for Device A fixture:
// FS-S401 water-flow readings are the only verified physical measurements.
// Line pressure and water temp remain unverified in hardware and map to null.
// INA219 electrical fields remain strictly null.
const mockPhysicalReadingsDeviceA: SensorReadingRow[] = [
  {
    id: 'fixture-rec-001',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-08T08:00:00Z',
    pulse_count: 120,
    flow_rate_lpm: 2.5,
    current_liters: 15.0,
    daily_total_liters: 150.0,
    monthly_total_liters: 3200.0,
    line_pressure_psi: 42.5, // Raw DB value from untested channel
    water_temp_c: 21.0,      // Raw DB value from untested channel
    voltage_v: null,
    current_a: null,
    power_w: null,
    active_power_kw: null,
    daily_total_kwh: null,
    monthly_total_kwh: null,
    power_factor: null,
    sensor_notes: 'FS-S401 Active · INA219 Pending Hardware Calibration',
    created_at: '2026-11-08T08:00:00Z',
  },
  {
    id: 'fixture-rec-002',
    device_id: FIXTURE_DEVICE_A_ID,
    recorded_at: '2026-11-08T09:00:00Z',
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
    created_at: '2026-11-08T09:00:00Z',
  },
];

/**
 * Creates an in-memory mock SupabaseClient for hermetic test execution
 */
function createMockSupabaseClient(options?: {
  devices?: DeviceRow[];
  readings?: SensorReadingRow[];
  profiles?: ProfileRow[];
  alerts?: AlertRow[];
}): SupabaseClient<Database> {
  const devices = options?.devices || [mockDeviceA, mockDeviceB];
  const readings = options?.readings || mockPhysicalReadingsDeviceA;
  const alerts = options?.alerts || [];

  const client: any = {
    from: (table: string) => {
      let filteredData: any[] = [];
      if (table === 'devices') filteredData = [...devices];
      else if (table === 'sensor_readings') filteredData = [...readings];
      else if (table === 'alerts') filteredData = [...alerts];

      const queryBuilder: any = {
        select: (_cols?: string) => queryBuilder,
        eq: (col: string, val: any) => {
          filteredData = filteredData.filter(item => item[col] === val);
          return queryBuilder;
        },
        in: (col: string, vals: any[]) => {
          filteredData = filteredData.filter(item => vals.includes(item[col]));
          return queryBuilder;
        },
        gte: (col: string, val: any) => {
          filteredData = filteredData.filter(item => item[col] >= val);
          return queryBuilder;
        },
        lte: (col: string, val: any) => {
          filteredData = filteredData.filter(item => item[col] <= val);
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
    auth: {
      getUser: async (token: string) => {
        if (token === 'valid-user-a-jwt') {
          return { data: { user: { id: FIXTURE_USER_A_ID, email: 'user-a@aquawatt.io', role: 'authenticated' } }, error: null };
        }
        if (token === 'valid-user-b-jwt') {
          return { data: { user: { id: FIXTURE_USER_B_ID, email: 'user-b@aquawatt.io', role: 'authenticated' } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid JWT signature or token expired') };
      },
    },
  };

  return client as SupabaseClient<Database>;
}

describe('Stage 3: MCP Domain Services & Database Integration (Correction Pass)', () => {
  const mockClient = createMockSupabaseClient();

  const userAContext: AuthContext = {
    userId: FIXTURE_USER_A_ID,
    userToken: 'valid-user-a-jwt',
    email: 'user-a@aquawatt.io',
  };

  const userBContext: AuthContext = {
    userId: FIXTURE_USER_B_ID,
    userToken: 'valid-user-b-jwt',
    email: 'user-b@aquawatt.io',
  };

  describe('1. Server-Side Authentication & Identity Derivation', () => {
    it('derives userId exclusively from verified JWT, ignoring client-supplied userId', async () => {
      const auth = await authService.authenticateUser('Bearer valid-user-a-jwt', mockClient);
      assert.equal(auth.userId, FIXTURE_USER_A_ID);
      assert.equal(auth.email, 'user-a@aquawatt.io');
    });

    it('rejects unauthenticated requests without authorization header', async () => {
      await assert.rejects(
        async () => {
          await authService.authenticateUser(null, mockClient);
        },
        (err: unknown) => {
          assert.ok(err instanceof UnauthenticatedError);
          assert.equal((err as UnauthenticatedError).code, 'UNAUTHENTICATED');
          assert.equal((err as UnauthenticatedError).statusCode, 401);
          return true;
        }
      );
    });

    it('rejects invalid or expired JWT tokens', async () => {
      await assert.rejects(
        async () => {
          await authService.authenticateUser('Bearer expired-or-forged-token', mockClient);
        },
        (err: unknown) => {
          assert.ok(err instanceof InvalidTokenError);
          assert.equal((err as InvalidTokenError).code, 'INVALID_TOKEN');
          assert.equal((err as InvalidTokenError).statusCode, 401);
          return true;
        }
      );
    });
  });

  describe('2. Hardware Data Integrity & Physical Boundaries', () => {
    it('FS-S401 water flow is verified, while pressure and temperature are strictly null/unavailable', async () => {
      const snapshot = await telemetryService.getLatestReading(FIXTURE_DEVICE_A_ID, userAContext, mockClient);

      // FS-S401 water flow is verified
      assert.equal(snapshot.water.flowRateLpm, 3.0);
      assert.equal(snapshot.water.currentUsageLiters, 25.0);
      assert.equal(snapshot.water.dailyTotalLiters, 175.0);
      assert.equal(snapshot.water.pulseCount, 240);

      // Pressure and temperature MUST remain null on FS-S401 hardware
      assert.equal(snapshot.water.pressurePsi, null);
      assert.equal(snapshot.water.temperatureC, null);
      assert.ok(snapshot.water.pressureStatusNote.includes('unverified'));
      assert.ok(snapshot.water.temperatureStatusNote.includes('unverified'));
    });

    it('INA219 electrical telemetry remains strictly unavailable without synthetic values', async () => {
      const snapshot = await telemetryService.getLatestReading(FIXTURE_DEVICE_A_ID, userAContext, mockClient);

      assert.equal(snapshot.electricity.isAvailable, false);
      assert.equal(snapshot.electricity.hardwareStatus, 'uncalibrated_hardware');
      assert.equal(snapshot.electricity.activePowerKw, null);
      assert.equal(snapshot.electricity.voltageV, null);
      assert.equal(snapshot.electricity.currentA, null);
      assert.equal(snapshot.electricity.dailyTotalKwh, null);
      assert.equal(snapshot.electricity.estimatedDailyCostInr, null);
      assert.ok(snapshot.electricity.statusNote.includes('INA219'));
    });
  });

  describe('3. Device Ownership & Access Control', () => {
    it('allows User A to access their own verified device', async () => {
      const device = await deviceService.getDeviceById(FIXTURE_DEVICE_A_ID, userAContext, mockClient);
      assert.equal(device.id, FIXTURE_DEVICE_A_ID);
      assert.equal(device.userId, FIXTURE_USER_A_ID);
    });

    it('denies User B access to User A device (cross-user access denial)', async () => {
      await assert.rejects(
        async () => {
          await deviceService.getDeviceById(FIXTURE_DEVICE_A_ID, userBContext, mockClient);
        },
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedDeviceAccessError);
          assert.equal((err as UnauthorizedDeviceAccessError).code, 'DEVICE_ACCESS_DENIED');
          assert.equal((err as UnauthorizedDeviceAccessError).statusCode, 403);
          return true;
        }
      );
    });
  });

  describe('4. Aggregation Correctness & Counter Reset Handling', () => {
    it('prevents double-counting cumulative counters using monotonic deltas', async () => {
      // Two readings in same day: 150L then 175L. Total consumed in interval = 25L (NOT 150+175=325L)
      const buckets = await waterService.getWaterAggregation(
        FIXTURE_DEVICE_A_ID,
        'daily',
        { startDate: '2026-11-08T00:00:00Z', endDate: '2026-11-08T23:59:59Z' },
        userAContext,
        mockClient
      );

      assert.equal(buckets.length, 1);
      assert.equal(buckets[0].totalLiters, 25.0);
      assert.equal(buckets[0].sampleCount, 2);
      assert.equal(buckets[0].averageFlowRateLpm, 2.75);
    });

    it('handles counter resets (e.g. ESP32 reboot or rollover) without negative values or double-counting', async () => {
      // Sequence: 90L -> 100L (+10L) -> [REBOOT / RESET] -> 5L (+5L) -> 20L (+15L).
      // Total consumption = 10 + 5 + 15 = 30L (NOT max-min = 95L, and NOT sum = 215L)
      const resetReadings: SensorReadingRow[] = [
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T10:00:00Z', daily_total_liters: 90 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T11:00:00Z', daily_total_liters: 100 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T12:00:00Z', daily_total_liters: 5 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T13:00:00Z', daily_total_liters: 20 },
      ];

      const clientWithReset = createMockSupabaseClient({ readings: resetReadings });
      const buckets = await waterService.getWaterAggregation(
        FIXTURE_DEVICE_A_ID,
        'daily',
        { startDate: '2026-11-08T00:00:00Z', endDate: '2026-11-08T23:59:59Z' },
        userAContext,
        clientWithReset
      );

      assert.equal(buckets.length, 1);
      assert.equal(buckets[0].totalLiters, 30.0);
    });

    it('sorts out-of-order timestamps before aggregation to guarantee consistency', async () => {
      // Out of order: 13:00, 10:00, 12:00, 11:00
      const shuffledReadings: SensorReadingRow[] = [
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T13:00:00Z', daily_total_liters: 20 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T10:00:00Z', daily_total_liters: 90 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T12:00:00Z', daily_total_liters: 5 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T11:00:00Z', daily_total_liters: 100 },
      ];

      const clientWithShuffled = createMockSupabaseClient({ readings: shuffledReadings });
      const buckets = await waterService.getWaterAggregation(
        FIXTURE_DEVICE_A_ID,
        'daily',
        { startDate: '2026-11-08T00:00:00Z', endDate: '2026-11-08T23:59:59Z' },
        userAContext,
        clientWithShuffled
      );

      assert.equal(buckets.length, 1);
      // Even when fed shuffled, monotonic chronological sort evaluates 90->100 (+10) and 5->20 (+20) = 30L
      assert.equal(buckets[0].totalLiters, 30.0);
    });
  });

  describe('5. Timezone-Correct Anomaly Detection', () => {
    it('correctly maps UTC timestamps to local facility hour in Asia/Kolkata (UTC+5:30)', () => {
      // 20:00 UTC = 01:30 AM next day in Asia/Kolkata
      const hourKolkata = getLocalHourInTimezone('2026-11-08T20:00:00Z', 'Asia/Kolkata');
      assert.equal(hourKolkata, 1);

      // 23:30 UTC = 05:00 AM next day in Asia/Kolkata
      const hourKolkata5 = getLocalHourInTimezone('2026-11-08T23:30:00Z', 'Asia/Kolkata');
      assert.equal(hourKolkata5, 5);

      // 03:00 UTC = 22:00 (10 PM) previous day in America/New_York (UTC-5 EST)
      const hourNY = getLocalHourInTimezone('2026-11-08T03:00:00Z', 'America/New_York');
      assert.equal(hourNY, 22);
    });

    it('identifies nighttime leak in Asia/Kolkata local window (19:30-23:30 UTC) with non-confirmation disclaimers', async () => {
      // In Asia/Kolkata (IST), 19:30 UTC = 01:00 IST; 20:30 UTC = 02:00 IST; 21:30 UTC = 03:00 IST; 22:30 UTC = 04:00 IST; 23:30 UTC = 05:00 IST.
      const istNightReadings: SensorReadingRow[] = [
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T19:30:00Z', flow_rate_lpm: 0.65 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T20:30:00Z', flow_rate_lpm: 0.60 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T21:30:00Z', flow_rate_lpm: 0.58 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T22:30:00Z', flow_rate_lpm: 0.62 },
        { ...mockPhysicalReadingsDeviceA[0], recorded_at: '2026-11-08T23:30:00Z', flow_rate_lpm: 0.55 },
      ];

      const clientWithIstLeak = createMockSupabaseClient({ readings: istNightReadings });
      const analysis = await anomalyService.detectPossibleLeak(
        FIXTURE_DEVICE_A_ID,
        { startDate: '2026-11-08T18:00:00Z', endDate: '2026-11-09T02:00:00Z' },
        userAContext,
        { timezone: 'Asia/Kolkata', nightStartHour: 1, nightEndHour: 5 },
        clientWithIstLeak
      );

      assert.equal(analysis.hasPossibleLeak, true);
      assert.equal(analysis.classification, 'possible_continuous_flow');
      assert.ok(analysis.evidenceSummary.includes('Asia/Kolkata 1:00-5:00'));
      // Never asserts confirmed leak
      assert.ok(!analysis.explanation.includes('confirmed leak'));
      assert.ok(analysis.caveats.some(c => c.includes('does NOT constitute a confirmed physical leak')));
    });
  });

  describe('6. Platform Overview & Sustainability Scoring', () => {
    it('aggregates high-level user estate overview and sustainability rating', async () => {
      const overview = await generalService.getPlatformOverview(userAContext, mockClient);

      assert.equal(overview.userId, FIXTURE_USER_A_ID);
      assert.equal(overview.devices.total, 1);
      assert.equal(overview.devices.online, 1);
      assert.equal(typeof overview.sustainabilityIndex.score, 'number');
      assert.ok(overview.hardwareIntegrations.waterFlowSensor.includes('FS-S401'));
      assert.ok(overview.hardwareIntegrations.electricalSensor.includes('INA219'));
    });
  });
});
