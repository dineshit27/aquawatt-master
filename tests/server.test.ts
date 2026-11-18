import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { validateEnv } from '../server/config/env.js';
import { createApp, type AppServerContext } from '../server.js';

describe('Stage 2: Server Foundation & MCP HTTP Transport', () => {
  let context: AppServerContext;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    context = await createApp({ disableVite: true });
    server = context.app.listen(0);
    const address = server.address();
    if (address && typeof address === 'object') {
      baseUrl = `http://localhost:${address.port}`;
    } else {
      throw new Error('Unable to bind test server address');
    }
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await context.close();
  });

  it('validates environment schema with sensible defaults', () => {
    const config = validateEnv({
      PORT: '4000',
      NODE_ENV: 'test',
    });

    assert.equal(config.PORT, 4000);
    assert.equal(config.NODE_ENV, 'test');
    assert.equal(config.MCP_SERVER_NAME, 'aquawatt-mcp-server');
    assert.equal(config.MCP_SERVER_VERSION, '1.0.0');
  });

  it('serves healthy status from /health endpoint', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const data = await res.json() as Record<string, unknown>;
    assert.equal(data.status, 'healthy');
    assert.equal(data.service, 'aquawatt-platform');
    assert.equal(data.version, '1.0.0');
    assert.equal(data.mcp, 'enabled');
    assert.equal(typeof data.timestamp, 'string');
    assert.equal(typeof data.uptimeSeconds, 'number');
    assert.ok(typeof data.uptimeSeconds === 'number' && data.uptimeSeconds >= 0);
  });

  it('includes security headers in HTTP responses', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  });

  it('initializes MCP Streamable HTTP endpoint and handles initialize request', async () => {
    const initPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'aquawatt-test-client',
          version: '1.0.0',
        },
      },
    };

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(initPayload),
    });

    assert.equal(res.status, 200);
    const sessionId = res.headers.get('mcp-session-id');
    assert.ok(sessionId, 'Response should contain mcp-session-id header');

    const text = await res.text();
    assert.ok(text.includes('aquawatt-mcp-server'), 'Response should mention aquawatt-mcp-server');
    assert.ok(text.includes('"jsonrpc":"2.0"'), 'Response should be valid JSON-RPC');
  });

  it('rejects protected tools/call requests when unauthenticated with HTTP 401', async () => {
    const toolCallPayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_device_telemetry',
        arguments: { deviceId: 'test-device' },
      },
    };

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolCallPayload),
    });

    assert.equal(res.status, 401);
    const data = await res.json() as Record<string, any>;
    assert.equal(data.jsonrpc, '2.0');
    assert.equal(data.error.code, -32001);
    assert.ok(data.error.message.includes('Authentication required'));
  });

  it('rejects requests with invalid or expired authentication tokens with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer forged-or-expired-token',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_device_telemetry' },
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json() as Record<string, any>;
    assert.equal(data.error.code, -32001);
  });
});

