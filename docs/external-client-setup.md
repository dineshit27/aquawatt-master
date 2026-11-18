# AquaWatt MCP — External Client Setup & Integration Guide

This guide provides step-by-step instructions and configuration files for connecting external Model Context Protocol (MCP) clients to the AquaWatt MCP platform.

---

## 1. Quick Connection Reference

- **Streamable HTTP Endpoint**: `https://<your-domain>/mcp` (or `http://localhost:3000/mcp` locally)
- **Protocol Version**: `2024-11-05`
- **Transport**: Official Streamable HTTP (`@modelcontextprotocol/sdk/server/streamableHttp.js`)
- **Authentication**: HTTP `Authorization: Bearer <supabase-jwt>`
- **Protected Resource Metadata**: `https://<your-domain>/.well-known/oauth-protected-resource/mcp`

---

## 2. Obtaining Your Supabase User JWT

To access protected AquaWatt devices, you must obtain a valid Supabase user JWT:

### Option A: From the AquaWatt Web Dashboard
1. Log into your AquaWatt web application in the browser.
2. Open Developer Tools (`F12`) > **Application** / **Storage** > **Local Storage**.
3. Locate the key `sb-<project-ref>-auth-token`.
4. Copy the `access_token` string.

### Option B: Via Supabase CLI or cURL
```bash
curl -X POST 'https://<your-project-ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <your-anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@yourdomain.com",
    "password": "your-secure-password"
  }'
```
The response contains `"access_token": "<jwt-token>"`.

---

## 3. Client Configuration Examples

### A. Claude Desktop

Add AquaWatt to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aquawatt": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote-client",
        "https://your-aquawatt-domain.run.app/mcp",
        "--header",
        "Authorization: Bearer <YOUR_SUPABASE_JWT>"
      ]
    }
  }
}
```
*Note: If connecting locally during development:*
```json
{
  "mcpServers": {
    "aquawatt-local": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote-client",
        "http://localhost:3000/mcp",
        "--header",
        "Authorization: Bearer <YOUR_SUPABASE_JWT>"
      ]
    }
  }
}
```

---

### B. Cursor IDE

In Cursor, open **Cursor Settings** > **Features** > **MCP Servers** > **Add New MCP Server** (or edit `.cursor/mcp.json` in your project root):

```json
{
  "mcpServers": {
    "aquawatt": {
      "url": "https://your-aquawatt-domain.run.app/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_SUPABASE_JWT>"
      }
    }
  }
}
```

---

### C. Official MCP Inspector

You can test and inspect AquaWatt interactively using the official Model Context Protocol Inspector:

```bash
npx @modelcontextprotocol/inspector
```
1. Set **Transport Type** to `Streamable HTTP`.
2. Set **URL** to `http://localhost:3000/mcp` (or your remote URL).
3. Under **Headers**, add:
   - Key: `Authorization`
   - Value: `Bearer <YOUR_SUPABASE_JWT>`
4. Click **Connect**.
5. You can now browse all 14 tools, 6 resources, and 5 prompts in real time.

---

## 4. Programmatic Client Integration (TypeScript / JavaScript)

You can connect to AquaWatt programmatically using the official `@modelcontextprotocol/sdk`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const userJwt = process.env.AQUAWATT_USER_JWT;
  const mcpUrl = new URL('https://your-aquawatt-domain.run.app/mcp');

  // 1. Initialize official Streamable HTTP transport with Bearer auth
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: {
      headers: {
        'Authorization': `Bearer ${userJwt}`,
      },
    },
  });

  const client = new Client({
    name: 'custom-aquawatt-agent',
    version: '1.0.0',
  });

  // 2. Establish connection and complete MCP handshake
  await client.connect(transport);
  console.log('Connected to AquaWatt MCP Server!');

  // 3. Discover available tools
  const { tools } = await client.listTools();
  console.log(`Discovered ${tools.length} tools`);

  // 4. Call a tool (e.g. list user devices)
  const deviceList = await client.callTool({
    name: 'list_user_devices',
    arguments: {},
  });
  console.log('User devices:', deviceList.content[0].text);

  // 5. Read an MCP resource
  const latestReadings = await client.readResource({
    uri: 'aquawatt://devices/<DEVICE_UUID>/latest-readings',
  });
  console.log('Latest readings:', latestReadings.contents[0].text);

  // 6. Fetch a reusable prompt
  const leakPrompt = await client.getPrompt({
    name: 'leak-investigation',
    arguments: { deviceId: '<DEVICE_UUID>' },
  });
  console.log('Prompt template:', leakPrompt.messages[0].content.text);

  // 7. Clean up connection
  await client.close();
}

main().catch(console.error);
```

---

## 5. Programmatic Client Integration (Python)

Using the official Python `mcp` SDK:

```python
import os
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

async def main():
    jwt_token = os.environ.get("AQUAWATT_USER_JWT")
    url = "https://your-aquawatt-domain.run.app/mcp"
    headers = {"Authorization": f"Bearer {jwt_token}"}

    async with streamable_http_client(url, headers=headers) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            print("Connected to AquaWatt MCP!")

            # List tools
            tools = await session.list_tools()
            print(f"Discovered {len(tools.tools)} tools")

            # Call tool
            result = await session.call_tool("list_user_devices", {})
            print("Devices:", result.content)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 6. Troubleshooting & Common Issues

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **HTTP 401 Unauthorized** (`-32001`) | Missing or expired Bearer JWT token | Provide a valid JWT in the `Authorization: Bearer <token>` header. Refresh expired tokens from Supabase Auth. |
| **HTTP 403 / Access Denied** | Attempted to query another user's device | Ensure the requested `deviceId` belongs to the authenticated user account. Check `list_user_devices` first. |
| **HTTP 404 Session Not Found** | Multi-replica deployment without sticky sessions, or session timed out | Ensure load balancer has session affinity enabled, or re-initialize a new session. |
| **CORS Error** | Browser origin not in `CORS_ORIGINS` | Add the frontend domain to `CORS_ORIGINS` in server environment variables. |
| **Null Electricity / Pressure Readings** | Physical hardware calibration boundaries | Expected behavior in physical mode: INA219 power and pressure/temp remain `null` until physical sensors are calibrated and verified. |
