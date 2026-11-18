import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getVerifiedContext } from '../tools/toolHelper.js';
import { deviceService } from '../../services/deviceService.js';
import { DomainServiceError } from '../../services/types.js';

export function registerAquaWattPrompts(server: McpServer): void {
  // =========================================================================
  // PROMPT 1: water-saving-advisor
  // Analyze consumption and provide practical water-saving recommendations.
  // =========================================================================
  server.registerPrompt(
    'water-saving-advisor',
    {
      title: 'Water Saving Advisor',
      description: 'Analyze consumption patterns and provide practical, prioritized water-saving recommendations for an AquaWatt monitoring node.',
      argsSchema: {
        deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).describe('Target device UUID (e.g. 33333333-3333-4333-8333-333333333333)'),
        timeRange: z.enum(['24h', '7d', '30d']).optional().describe('Analysis time window (default: 7d)'),
      },
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const timeframe = args.timeRange || '7d';

        return {
          description: `Water Saving Analysis & Action Plan for ${device.name} (${timeframe})`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are the AquaWatt Water Intelligence Specialist. Please evaluate water consumption for device '${device.name}' (ID: ${device.id}, Location: ${device.location}) over the past ${timeframe} and formulate an actionable water-saving plan.

Instructions:
1. First, inspect resource \`aquawatt://devices/${device.id}/water-summary\` and call tool \`analyze_water_usage\` with deviceId "${device.id}" and timeRange "${timeframe}".
2. Check whether continuous nocturnal flow is detected using tool \`detect_possible_leaks\`.
3. Synthesize your analysis into four clear sections:
   - Consumption Summary: Total liters consumed, average flow rate in LPM, and estimated municipal cost impact.
   - Flow Pattern Insights: Identified peak consumption windows and baseline off-peak flow.
   - Efficiency Recommendations: Practical steps (such as low-flow aerators, scheduled washing, or valve pressure tuning) with estimated potential savings.
   - Verification Reminder: Remind facility operators to inspect physical plumbing fixtures and meters on-site before executing major plumbing modifications.`,
              },
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // PROMPT 2: electricity-usage-review
  // Analyze verified electrical readings and explain hardware availability.
  // =========================================================================
  server.registerPrompt(
    'electricity-usage-review',
    {
      title: 'Electricity Usage Review & Calibration Guide',
      description: 'Review electrical monitoring telemetry and guide calibration requirements for attached INA219 power sensors.',
      argsSchema: {
        deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).describe('Target device UUID'),
        timeRange: z.enum(['24h', '7d', '30d']).optional().describe('Analysis timeframe (default: 24h)'),
      },
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const timeframe = args.timeRange || '24h';

        return {
          description: `Electricity Telemetry Status & Hardware Calibration Review for ${device.name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are the AquaWatt IoT Hardware & Energy Specialist. Please review the electrical monitoring status for device '${device.name}' (ID: ${device.id}, Location: ${device.location}) over the ${timeframe} window.

CRITICAL HARDWARE DIRECTIVE:
1. Read resource \`aquawatt://devices/${device.id}/electricity-summary\` to determine hardware state.
2. The INA219 DC voltage/current sensor is currently in **'INA219_PENDING_CALIBRATION'** state.
3. You must NEVER fabricate, hallucinate, or simulate power consumption (watts), current (amps), or energy (kWh) in physical mode.
4. Explain clearly to the user that electrical metrics are withheld until hardware bench calibration is completed.
5. Provide the physical calibration and wiring checklist:
   - Verification of I2C bus wiring (SDA/SCL) and pullup resistors to ESP32.
   - Verification of shunt resistor value (typically 0.1 ohm) and calibration register configuration.
   - Bench test validation against calibrated digital multimeter under known resistive load.
   - Safety instructions for isolating mains power before connecting voltage sensing leads.`,
              },
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // PROMPT 3: leak-investigation
  // Investigate unusual or continuous water flow with evidence-based diagnostics.
  // Never claim a confirmed leak.
  // =========================================================================
  server.registerPrompt(
    'leak-investigation',
    {
      title: 'Explainable Leak Investigation',
      description: 'Investigate potential continuous flow and nocturnal water anomalies with transparent evidence and physical inspection checklists.',
      argsSchema: {
        deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).describe('Target device UUID'),
        timezone: z.string().optional().describe('Facility local timezone (default: Asia/Kolkata)'),
        nightStartHour: z.string().optional().describe('Start hour of local off-peak nocturnal window (default: 1)'),
        nightEndHour: z.string().optional().describe('End hour of local off-peak nocturnal window (default: 5)'),
      },
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
        const tz = args.timezone || 'Asia/Kolkata';
        const startH = Number(args.nightStartHour ?? 1);
        const endH = Number(args.nightEndHour ?? 5);

        return {
          description: `Evidence-Based Leak Investigation Diagnostic for ${device.name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are the AquaWatt Forensic Water Systems Engineer. Please conduct a thorough investigation into possible continuous water flow for device '${device.name}' (ID: ${device.id}, Location: ${device.location}).

Investigation Protocol:
1. Inspect active alerts by reading \`aquawatt://devices/${device.id}/alerts\` to check for unresolved continuous flow or high night usage alerts.
2. Call tool \`detect_possible_leaks\` with deviceId "${device.id}", timezone "${tz}", nightStartHour ${startH}, and nightEndHour ${endH}.
3. STRICT NON-CONFIRMATION RULE:
   - Continuous nocturnal flow is an *unusual flow observation*, NOT a confirmed physical leak.
   - You must NEVER state that a leak is confirmed.
4. Structure your response into:
   - Anomaly Evidence: Consecutive hours of uninterrupted flow, minimum baseline LPM, and estimated nocturnal liters.
   - Confidence Rating: Low, Medium, or High with clear explanation of rationale.
   - Legitimate Flow Exclusions: Explain potential non-leak sources (e.g. automated landscape irrigation, water softener brine cycles, cooling tower top-up, night shift operations).
   - On-Site Physical Inspection Checklist:
     * Check A: Inspect toilet flapper valves and overflow tubes with dye tablets.
     * Check B: Inspect reverse osmosis (RO) waste lines and pressure relief valves.
     * Check C: Perform an isolation test by closing the main sub-meter valve and verifying whether the FS-S401 turbine stops registering pulses.`,
              },
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // PROMPT 4: monthly-sustainability-report
  // Generate a monthly sustainability report covering measured water,
  // available electricity data, estimates and sustainability indicators.
  // =========================================================================
  server.registerPrompt(
    'monthly-sustainability-report',
    {
      title: 'Monthly Sustainability & ESG Utility Report',
      description: 'Generate an executive monthly sustainability report distinguishing verified telemetry from calculated estimates.',
      argsSchema: {
        month: z.string().optional().describe('Reporting month in YYYY-MM format (e.g. 2026-11)'),
        deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).optional().describe('Optional device UUID filter'),
      },
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        let deviceName = 'All Estate Devices';
        if (args.deviceId) {
          const device = await deviceService.validateDeviceOwnership(args.deviceId, context);
          deviceName = device.name;
        }

        const reportingMonth = args.month || new Date().toISOString().slice(0, 7);

        return {
          description: `AquaWatt Monthly Sustainability Report for ${reportingMonth} (${deviceName})`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are the AquaWatt Chief Sustainability Officer and Environmental Engineer. Please generate the Monthly Sustainability and Resource Efficiency Report for ${reportingMonth}. Scope: ${deviceName}.

Reporting Requirements:
1. Read resource \`aquawatt://devices\` to establish active monitoring topology.
2. Call tool \`generate_sustainability_report\` for the current reporting month.
3. DATA BOUNDARY & INTEGRITY MANDATE:
   - Clearly delineate **Measured Telemetry** (actual pulse-verified water flow liters from FS-S401 sensors) from **Calculated Estimates** (embodied carbon avoided factor ~0.0003 kg CO2/L).
   - State transparently that electricity monitoring is pending INA219 hardware calibration.
   - State that line pressure and temperature are unverified channels in the physical test rig.
4. Report Structure:
   - Executive Environmental Scorecard: Sustainability Index (0-100), Grade Tier, and total water volume managed.
   - Resource Breakdown: Measured water metrics vs uncalibrated power status.
   - Embodied Carbon Impact: Avoided municipal water treatment emissions.
   - Three Strategic ESG Recommendations: Prioritized operational actions for the upcoming billing cycle.`,
              },
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );

  // =========================================================================
  // PROMPT 5: household-utility-review
  // Produce a combined review of devices, water consumption, electricity
  // availability and alerts.
  // =========================================================================
  server.registerPrompt(
    'household-utility-review',
    {
      title: 'Estate Utility & Health Overview',
      description: 'Produce a comprehensive operational health review across all registered IoT nodes, telemetry channels, active alerts, and facility status.',
    },
    async (arg1: any, arg2?: any) => {
      try {
        const extra = (arg2 && (arg2.authInfo || arg2.sessionId)) ? arg2 : arg1;
        const context = getVerifiedContext(extra);

        return {
          description: 'AquaWatt Whole-Estate Utility Health Review',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are the AquaWatt Facility Operations Manager. Please perform a comprehensive operational review of the user's IoT hardware estate and utility consumption.

Operational Diagnostic Protocol:
1. Read resource \`aquawatt://devices\` to inspect all registered nodes, their connectivity status, and attached sensors.
2. Call tool \`get_utility_overview\` to fetch aggregate facility metrics and sustainability ratings.
3. Call tool \`get_active_alerts\` with severity "all" to review unresolved threshold exceptions.
4. Synthesize your review into five clear briefing sections:
   - IoT Infrastructure Health: Count of online vs offline ESP32 nodes, signal strength (dBm), and battery levels.
   - Real-Time Water Flow: Current estate flow rate (LPM), today's accumulated volume, and sensor integrity notes.
   - Electrical Subsystem Status: Explicit status of INA219 sensors (pending bench calibration).
   - Active Warnings & Alert Triage: Summary of any critical or warning-level issues requiring operator attention.
   - Recommended Next Actions: Clear 2-3 step priority checklist for facility engineers.`,
              },
            },
          ],
        };
      } catch (err) {
        if (err instanceof DomainServiceError) {
          throw new McpError(ErrorCode.InvalidParams, err.message);
        }
        throw err;
      }
    }
  );
}
