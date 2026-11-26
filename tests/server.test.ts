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

  it('serves /robots.txt and /sitemap.xml with expected directives and URLs', async () => {
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.ok((robotsRes.headers.get('content-type') || '').includes('text/plain'));
    const robotsText = await robotsRes.text();
    assert.ok(robotsText.includes('Allow: /'));
    assert.ok(robotsText.includes('Disallow: /dashboard'));
    assert.ok(robotsText.includes('Sitemap:'));

    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    assert.ok((sitemapRes.headers.get('content-type') || '').includes('application/xml'));
    const sitemapXml = await sitemapRes.text();
    assert.ok(sitemapXml.includes('<urlset'));
    assert.ok(sitemapXml.includes('/contact</loc>'));
  });

  it('serves 200 for known SPA routes and real 404 for unknown paths via serveSpaWithSeo', async () => {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const express = (await import('express')).default;
    const { serveSpaWithSeo } = await import('../server/seo.js');

    const tmpDist = fs.mkdtempSync(path.join(os.tmpdir(), 'aquawatt-seo-'));
    fs.writeFileSync(
      path.join(tmpDist, 'index.html'),
      '<!doctype html><html><head><link rel="canonical" href="%VITE_SITE_URL%/" /></head><body><div id="root"></div></body></html>'
    );

    const spaApp = express();
    serveSpaWithSeo(spaApp, tmpDist, 'https://aquawatt.example');
    const spaServer = spaApp.listen(0);
    const addr = spaServer.address();
    if (!addr || typeof addr !== 'object') throw new Error('Unable to bind SPA test server');
    const spaUrl = `http://localhost:${addr.port}`;

    try {
      const homeRes = await fetch(`${spaUrl}/`);
      assert.equal(homeRes.status, 200);
      const homeHtml = await homeRes.text();
      assert.ok(homeHtml.includes('https://aquawatt.example/'));

      const dashRes = await fetch(`${spaUrl}/dashboard`);
      assert.equal(dashRes.status, 200);
      assert.equal(dashRes.headers.get('x-robots-tag'), 'noindex, nofollow');

      const notFoundRes = await fetch(`${spaUrl}/does-not-exist`);
      assert.equal(notFoundRes.status, 404);
      assert.equal(notFoundRes.headers.get('x-robots-tag'), 'noindex, nofollow');
    } finally {
      await new Promise<void>(resolve => spaServer.close(() => resolve()));
      fs.rmSync(tmpDist, { recursive: true, force: true });
    }
  });

  it('allows same-host and RENDER_EXTERNAL_URL origins in production without 500 errors on third-party origins', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevRenderUrl = process.env.RENDER_EXTERNAL_URL;
    process.env.NODE_ENV = 'production';
    process.env.RENDER_EXTERNAL_URL = 'https://aquawatt-io.onrender.com';

    const prodCtx = await createApp({ disableVite: true });
    const prodServer = prodCtx.app.listen(0);
    const addr = prodServer.address();
    if (!addr || typeof addr !== 'object') throw new Error('Unable to bind prod test server');
    const prodUrl = `http://localhost:${addr.port}`;

    try {
      const renderRes = await fetch(`${prodUrl}/health`, {
        headers: {
          Origin: 'https://aquawatt-io.onrender.com',
          'X-Forwarded-Host': 'aquawatt-io.onrender.com',
        },
      });
      assert.equal(renderRes.status, 200);
      assert.equal(
        renderRes.headers.get('access-control-allow-origin'),
        'https://aquawatt-io.onrender.com'
      );

      const customSameHostRes = await fetch(`${prodUrl}/health`, {
        headers: {
          Origin: 'https://custom-host.example',
          'X-Forwarded-Host': 'custom-host.example',
        },
      });
      assert.equal(customSameHostRes.status, 200);
      assert.equal(
        customSameHostRes.headers.get('access-control-allow-origin'),
        'https://custom-host.example'
      );

      const deniedRes = await fetch(`${prodUrl}/health`, {
        headers: {
          Origin: 'https://untrusted.example',
          'X-Forwarded-Host': 'aquawatt-io.onrender.com',
        },
      });
      assert.equal(deniedRes.status, 200);
      assert.equal(deniedRes.headers.get('access-control-allow-origin'), null);
    } finally {
      await new Promise<void>(resolve => prodServer.close(() => resolve()));
      await prodCtx.close();
      process.env.NODE_ENV = prevNodeEnv;
      if (prevRenderUrl === undefined) {
        delete process.env.RENDER_EXTERNAL_URL;
      } else {
        process.env.RENDER_EXTERNAL_URL = prevRenderUrl;
      }
    }
  });
});



