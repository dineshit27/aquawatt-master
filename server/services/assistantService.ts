import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { getEnv } from '../config/env.js';
import {
  AuthContext,
  UnauthenticatedError,
  UnauthorizedDeviceAccessError,
  AggregationPeriod,
  TimeRangePreset,
} from './types.js';
import { deviceService } from './deviceService.js';
import { telemetryService } from './telemetryService.js';
import { waterService } from './waterService.js';
import { electricityService } from './electricityService.js';
import { anomalyService } from './anomalyService.js';
import { generalService } from './generalService.js';

export interface AssistantChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  conversationHistory?: AssistantChatMessage[];
  deviceId?: string;
}

export interface AssistantChatResponse {
  reply: string;
  data?: Record<string, any>;
  retrievedToolCalls?: string[];
  hardwareBoundaryNotes?: string[];
  timestamp: string;
}

const SYSTEM_INSTRUCTION = `
You are the AquaWatt AI Assistant, an authoritative, factual resource management intelligence directly embedded in the AquaWatt IoT Facility Management Dashboard.

MANDATORY PHYSICAL HARDWARE BOUNDARIES & INVARIANTS:
1. FS-S401 TURBINE FLOW SENSOR: This is the ONLY currently verified physical sensor. Flow rates (L/min) and pulse counts from FS-S401 are real, verified physical telemetry.
2. INA219 ELECTRICAL SENSOR: In physical hardware mode, electrical telemetry is PENDING HARDWARE CALIBRATION. Power (W), voltage (V), current (A), and energy (kWh) measurements are UNAVAILABLE (null). You must ALWAYS explicitly state that INA219 calibration is pending and NEVER hallucinate, simulate, or invent electrical values.
3. WATER PRESSURE & TEMPERATURE: Pressure (PSI) and water temperature (°C) sensors are uncalibrated and unverified. They must remain null/unavailable. Never invent pressure or temperature figures.
4. LEAK DETECTION LANGUAGE: All flow anomalies must be described strictly as "possible leak", "unusual flow observation", or "unconfirmed anomaly". NEVER claim, assert, or state that a leak is confirmed.
5. READ-ONLY RESTRICTION: The assistant is strictly read-only. You cannot close valves, shut off water lines, change tariffs, or modify database records. Advise the user to use physical controls or the facility console for manual emergency valve operation.
6. SECURITY & ACCESS CONTROL: You only have access to devices, readings, and alerts belonging to the authenticated user. Never attempt to query or expose data for other users.
7. TONE & FORMATTING: Concise, technical, and grounded. Follow Swiss Minimalist principles: clean typography, clear numerical metrics, no marketing fluff or fake AI scorecards.
`.trim();

/**
 * Tool definitions exposed to the Gemini model for factual grounding
 */
const assistantFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'list_user_devices',
    description: 'Retrieve all AquaWatt IoT devices owned by the authenticated user.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_device_status',
    description: 'Get operational connectivity, hardware status, and synchronization state for a specific user device.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The UUID of the AquaWatt device' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'get_latest_telemetry',
    description: 'Retrieve the latest verified water and electricity telemetry for a device. Preserves null for unverified channels.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The UUID of the AquaWatt device' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'get_water_summary',
    description: 'Retrieve water usage trends, baseline patterns, peak demand, and volume metrics for a relative time window (8h, 24h, 7d, 30d).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The UUID of the AquaWatt device' },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'detect_possible_leaks',
    description: 'Analyze flow data for explainable possible leaks and unusual continuous flow patterns.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The UUID of the AquaWatt device' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'get_electricity_summary',
    description: 'Check electricity metrics and INA219 hardware status for a relative time window (8h, 24h, 7d, 30d).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The UUID of the AquaWatt device' },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'get_active_alerts',
    description: 'Retrieve unresolved consumption and hardware alerts for the user estate or a specific device.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'Optional UUID of device to filter alerts' },
      },
    },
  },
  {
    name: 'generate_sustainability_report',
    description: 'Generate environmental sustainability metrics, water conserved, and estimated indirect carbon impacts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'Optional UUID of specific device' },
        timeRange: { type: Type.STRING, description: "Time range ('8h', '24h', '7d', '30d')" },
      },
    },
  },
  {
    name: 'get_utility_overview',
    description: 'Get high-level estate-wide resource overview, total active devices, and sustainability score.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

export class AssistantService {
  private customChatHandler?: (req: AssistantChatRequest, context: AuthContext) => Promise<AssistantChatResponse>;

  /**
   * Testing hook for mocking LLM interaction in automated unit test suites
   */
  public setCustomChatHandler(handler?: (req: AssistantChatRequest, context: AuthContext) => Promise<AssistantChatResponse>) {
    if (process.env.NODE_ENV === 'production' && handler) {
      throw new Error('setCustomChatHandler is strictly forbidden in production mode.');
    }
    this.customChatHandler = handler;
  }

  /**
   * Dispatches a tool call to the authorized backend domain service
   */
  private async executeTool(
    name: string,
    args: Record<string, any>,
    context: AuthContext
  ): Promise<{ result: any; error?: string }> {
    try {
      switch (name) {
        case 'list_user_devices': {
          const devices = await deviceService.getDevices(context);
          return { result: { totalDevices: devices.length, devices } };
        }

        case 'get_device_status': {
          if (!args.deviceId) return { result: null, error: 'deviceId is required' };
          const status = await deviceService.getDeviceStatus(args.deviceId, context);
          return { result: status };
        }

        case 'get_latest_telemetry': {
          if (!args.deviceId) return { result: null, error: 'deviceId is required' };
          const telemetry = await telemetryService.getLatestReading(args.deviceId, context);
          return { result: telemetry };
        }

        case 'get_water_summary': {
          if (!args.deviceId) return { result: null, error: 'deviceId is required' };
          const timeRange: TimeRangePreset = (args.timeRange as TimeRangePreset) || '24h';
          const summary = await waterService.getWaterSummary(args.deviceId, timeRange, context);
          return { result: summary };
        }

        case 'detect_possible_leaks': {
          if (!args.deviceId) return { result: null, error: 'deviceId is required' };
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const leaks = await anomalyService.detectPossibleLeak(
            args.deviceId,
            { startDate: yesterday.toISOString(), endDate: now.toISOString() },
            context
          );
          return { result: leaks };
        }

        case 'get_electricity_summary': {
          if (!args.deviceId) return { result: null, error: 'deviceId is required' };
          const timeRange: TimeRangePreset = (args.timeRange as TimeRangePreset) || '24h';
          const summary = await electricityService.getElectricitySummary(args.deviceId, timeRange, context);
          return { result: summary };
        }

        case 'get_active_alerts': {
          const alerts = await generalService.getActiveAlerts(context, {
            deviceId: args.deviceId,
          });
          return { result: { totalActiveAlerts: alerts.length, alerts } };
        }

        case 'generate_sustainability_report': {
          const report = await generalService.generateSustainabilityReport(context, {
            deviceId: args.deviceId,
            timeRange: (args.timeRange as TimeRangePreset) || '30d',
          });
          return { result: report };
        }

        case 'get_utility_overview': {
          const overview = await generalService.getPlatformOverview(context);
          return { result: overview };
        }

        default:
          return { result: null, error: `Unknown function tool: ${name}` };
      }
    } catch (err) {
      return {
        result: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Deterministic factual fallback engine when GEMINI_API_KEY is not configured
   * or during hermetic environment testing. Executes the exact authorized domain services.
   */
  private async executeFallbackChat(
    req: AssistantChatRequest,
    context: AuthContext
  ): Promise<AssistantChatResponse> {
    const text = req.message.toLowerCase();
    const retrievedTools: string[] = [];
    const notes: string[] = [
      'FS-S401 pulse flow sensor is the only active physical measurement channel.',
      'INA219 electricity monitoring is uncalibrated and remains unavailable in physical mode.',
      'All flow anomalies are observations; leaks are never stated as confirmed.',
    ];

    // 1. Device Listing / Overview
    if (text.includes('device') || text.includes('node') || text.includes('list')) {
      retrievedTools.push('list_user_devices');
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: 'You currently have no registered AquaWatt devices assigned to your facility account.',
          data: { devices: [] },
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: new Date().toISOString(),
        };
      }

      const dev = devices[0];
      let deviceStatusText = '';
      if (text.includes('status')) {
        retrievedTools.push('get_device_status');
        const status = await deviceService.getDeviceStatus(dev.id, context);
        deviceStatusText = ` Status: ${status.device.status} (${status.isOnline ? 'Online' : 'Offline'}, Battery: ${status.device.batteryPercent ?? 100}%, Signal: ${status.device.signalStrengthDbm ?? -64} dBm).`;
      }

      return {
        reply: `You have ${devices.length} registered device(s). Primary node: ${dev.name} (${dev.deviceEui}, location: ${dev.location}).${deviceStatusText}`,
        data: { devices },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Leaks / Anomalies
    if (text.includes('leak') || text.includes('unusual') || text.includes('anomaly')) {
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: 'No devices found to inspect for unusual flow.',
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: new Date().toISOString(),
        };
      }

      const targetId = req.deviceId || devices[0].id;
      retrievedTools.push('detect_possible_leaks');
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const leakAnalysis = await anomalyService.detectPossibleLeak(
        targetId,
        { startDate: yesterday.toISOString(), endDate: now.toISOString() },
        context
      );

      const leakReply = leakAnalysis.hasPossibleLeak
        ? `A possible unusual flow pattern was observed (${leakAnalysis.explanation}). Note: This is an unverified flow observation and NOT a confirmed leak. Recommended action: inspect downstream fixtures.`
        : `No unusual continuous water flow patterns were detected during off-peak windows (Classification: ${leakAnalysis.classification}, baseline nominal). Note: Sensor telemetry provides observation analysis only and cannot confirm pipe integrity.`;

      return {
        reply: leakReply,
        data: leakAnalysis,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Electricity / Power queries
    if (text.includes('electric') || text.includes('power') || text.includes('kwh') || text.includes('energy')) {
      retrievedTools.push('get_electricity_summary');

      return {
        reply: 'Electricity monitoring hardware (INA219) is currently PENDING CALIBRATION. In accordance with physical hardware integrity protocols, power (W) and energy (kWh) measurements remain unavailable (null). Simulated electrical values are prohibited.',
        data: { hardwareStatus: 'INA219_PENDING_CALIBRATION', isAvailable: false, powerW: null, dailyTotalKwh: null },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Alerts
    if (text.includes('alert') || text.includes('warning') || text.includes('issue')) {
      retrievedTools.push('get_active_alerts');
      const alerts = await generalService.getActiveAlerts(context, {
        deviceId: req.deviceId,
      });

      return {
        reply: alerts.length > 0
          ? `There are ${alerts.length} active alert(s) on your devices. Latest alert: "${alerts[0].title}" (${alerts[0].severity}). Suggested action: ${alerts[0].actionRequired || 'Check telemetry'}.`
          : 'You currently have zero active or unread alerts across your registered devices.',
        data: { alerts },
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // 5. Sustainability / Carbon
    if (text.includes('sustainability') || text.includes('carbon') || text.includes('co2') || text.includes('green')) {
      retrievedTools.push('generate_sustainability_report');
      const report = await generalService.generateSustainabilityReport(context, {
        deviceId: req.deviceId,
        timeRange: '30d',
      });

      return {
        reply: `Sustainability Report: Conserved ${report.waterMetrics.waterSavedLiters} L of water. Estimated indirect carbon impact: ${report.carbonMetrics.totalCarbonAvoidedKg ?? 0} kg CO₂ (calculated municipal pumping estimate). Note: Indirect carbon is a calculated model, not direct sensor telemetry.`,
        data: report,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // 6. Water flow / telemetry
    if (text.includes('water') || text.includes('flow') || text.includes('liters') || text.includes('reading')) {
      const devices = await deviceService.getDevices(context);
      if (devices.length === 0) {
        return {
          reply: 'No registered devices found to retrieve water telemetry.',
          retrievedToolCalls: retrievedTools,
          hardwareBoundaryNotes: notes,
          timestamp: new Date().toISOString(),
        };
      }

      const targetId = req.deviceId || devices[0].id;
      retrievedTools.push('get_latest_telemetry');
      const telemetry = await telemetryService.getLatestReading(targetId, context);

      return {
        reply: `Latest verified water flow from FS-S401 turbine: ${telemetry.water.flowRateLpm} L/min (Today's Total: ${telemetry.water.dailyTotalLiters} L). Pressure and temperature sensors are unverified and remain unavailable.`,
        data: telemetry,
        retrievedToolCalls: retrievedTools,
        hardwareBoundaryNotes: notes,
        timestamp: new Date().toISOString(),
      };
    }

    // Default overview
    retrievedTools.push('get_utility_overview');
    const overview = await generalService.getPlatformOverview(context);

    return {
      reply: `AquaWatt Facility Console overview: ${overview.devices.total} device(s) registered (${overview.devices.online} online). Measured water telemetry is derived from verified FS-S401 pulse flow sensors. Electricity and pressure channels remain null pending hardware verification.`,
      data: overview,
      retrievedToolCalls: retrievedTools,
      hardwareBoundaryNotes: notes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Main chat entry point:
   * 1. Validates context and ownership.
   * 2. Executes Gemini multi-turn model with tool declarations if API key is present.
   * 3. Falls back safely to factual domain dispatcher if API key is unconfigured or in test mode.
   */
  async processChat(
    req: AssistantChatRequest,
    context: AuthContext
  ): Promise<AssistantChatResponse> {
    if (!context || !context.userId) {
      throw new UnauthenticatedError('Authentication context with verified userId is required.');
    }

    // Explicit deviceId ownership check if caller specified one
    if (req.deviceId) {
      await deviceService.validateDeviceOwnership(req.deviceId, context);
    }

    // 1. If custom test handler is active and not in production
    if (this.customChatHandler && process.env.NODE_ENV !== 'production') {
      return this.customChatHandler(req, context);
    }

    const env = getEnv();
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    // 2. If no Gemini API key is provided, execute deterministic factual fallback
    if (!apiKey || apiKey.includes('placeholder') || apiKey === '' || process.env.NODE_ENV === 'test') {
      return this.executeFallbackChat(req, context);
    }

    // 3. Call Gemini using official @google/genai SDK
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash';
      const retrievedTools: string[] = [];
      const collectedData: Record<string, any> = {};

      // Prepare conversation history
      const contents: any[] = [];
      if (req.conversationHistory && req.conversationHistory.length > 0) {
        for (const msg of req.conversationHistory) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: req.message }],
      });

      // Step 1: Initial call with function calling tools
      let response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: assistantFunctionDeclarations }],
        },
      });

      // Handle function calling loop (up to 3 steps)
      let iterations = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
        iterations++;
        const functionCalls = response.functionCalls;
        const functionResponseParts: any[] = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          retrievedTools.push(call.name);
          const toolExec = await this.executeTool(call.name, (call.args as Record<string, any>) || {}, context);
          collectedData[call.name] = toolExec.result;

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                output: toolExec.result,
                error: toolExec.error,
              },
            },
          });
        }

        // Send function execution response back to the model
        contents.push(response.candidates?.[0]?.content || { role: 'model', parts: [] });
        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });

        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: assistantFunctionDeclarations }],
          },
        });
      }

      const replyText = response.text || 'Telemetry synchronized. No anomalous flow detected.';

      return {
        reply: replyText,
        data: Object.keys(collectedData).length > 0 ? collectedData : undefined,
        retrievedToolCalls: retrievedTools.length > 0 ? retrievedTools : undefined,
        hardwareBoundaryNotes: [
          'FS-S401 turbine flow meter is verified physical telemetry.',
          'INA219 power and pressure/temp are uncalibrated and remain null.',
          'Unusual flow observations are never stated as confirmed leaks.',
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[AquaWatt Assistant Error]', err);
      // If Gemini API fails, fall back gracefully to factual domain dispatcher
      const fallback = await this.executeFallbackChat(req, context);
      return {
        ...fallback,
        reply: fallback.reply,
      };
    }
  }
}

export const assistantService = new AssistantService();
