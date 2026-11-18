# AquaWatt MCP — Deployment & Infrastructure Guide

This guide covers production deployment readiness, environment configuration, reverse proxy integration, session scaling strategies, and security best practices for the AquaWatt MCP platform.

---

## 1. Production Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | `development` | Environment mode (`production`, `development`, or `test`). In `production`, test injection hooks are strictly blocked. |
| `PORT` | `number` | `3000` | Port for the Express HTTP & Streamable HTTP MCP server. |
| `HOST` | `string` | `0.0.0.0` | Network binding interface. |
| `APP_URL` | `string` (URL) | `http://localhost:3000` | Publicly reachable base URL of the deployment (used for RFC 9728 metadata and documentation links). |
| `CORS_ORIGINS` | `string` | `http://localhost:3000` | Comma-separated allowed HTTP origins for web clients. Requests from desktop/CLI tools with no origin header are permitted by default. |
| `VITE_SUPABASE_URL` | `string` (URL) | *None* | Supabase project API URL (e.g., `https://xyzcompany.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | `string` | *None* | Supabase client anon public key used for client authentication. |
| `SUPABASE_SERVICE_ROLE_KEY` | `string` | *None* | Optional. Administrative service key for backend jobs. Never exposed to clients or used without explicit authorization. |
| `MCP_SERVER_NAME` | `string` | `aquawatt-mcp-server` | Reported MCP server name in `initialize` response. |
| `MCP_SERVER_VERSION` | `string` | `1.0.0` | Reported MCP server version in `initialize` response. |
| `MCP_SESSION_TTL_MS` | `number` | `1800000` (30 min) | Inactivity threshold before an MCP session is automatically swept and closed. |
| `MCP_SESSION_CLEANUP_INTERVAL_MS` | `number` | `300000` (5 min) | Frequency of the background session sweeper interval. |
| `TRUST_PROXY` | `boolean` / `number` | `true` | Enables Express `trust proxy` (set to `1` or `true` when behind Cloud Run, AWS ALB, Nginx, or Caddy). |

---

## 2. Reverse Proxy & HTTPS Deployment

When deploying to Google Cloud Run, AWS App Runner, Fly.io, or behind an Nginx/Caddy reverse proxy:

### 1. Reverse Proxy Trust
AquaWatt configures `app.set('trust proxy', 1)` when `TRUST_PROXY` is enabled. This ensures that:
- `req.ip` reflects the client's genuine public IP instead of the reverse proxy container IP.
- `req.secure` and `req.headers['x-forwarded-proto']` accurately detect HTTPS connections.

### 2. Transport Layer Security (TLS/HTTPS)
AquaWatt automatically sets strict transport security headers when running in production or behind HTTPS:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 3. CORS Configuration
The server exposes headers required by Streamable HTTP MCP clients:
- Allowed Methods: `GET, POST, PUT, DELETE, OPTIONS, PATCH`
- Allowed Headers: `Content-Type, Authorization, mcp-session-id, last-event-id, x-requested-with`
- Exposed Headers: `mcp-session-id, WWW-Authenticate`

---

## 3. Session Registry Architecture & Horizontal Scaling

### Current In-Memory Session Architecture
AquaWatt MCP uses an in-memory `Map<string, McpSessionRecord>` (`sessionMap` in `server/mcp/server.ts`) to manage active Streamable HTTP transports and authenticated session contexts:

```
[Incoming Request]
  │
  ├── Headers contain 'mcp-session-id'?
  │     ├── YES ──► Look up session in sessionMap ──► Route to existing transport
  │     └── NO  ──► Is initialize request?
  │                   ├── YES ──► Create new transport & register session in sessionMap
  │                   └── NO  ──► 400 Bad Request
```

### Single-Instance Deployments
For single-container deployments (e.g., standard Cloud Run instance with concurrency, Docker container, or VPS), this in-memory session registry is fast, hermetic, and requires zero external infrastructure.

### Multi-Instance / Clustered Deployments
When scaling out horizontally across multiple container replicas (e.g., Kubernetes pods or Cloud Run instances with minimum replicas > 1):
- **Limitation**: A client that initializes a session on Replica A will fail with `404 Session not found` if a subsequent request carrying `mcp-session-id` is routed to Replica B.
- **Required Solution 1 (Recommended for simplicity)**: **Session Affinity (Sticky Sessions)**. Configure the load balancer (e.g. Cloud Run Session Affinity or Nginx `ip_hash` / cookie affinity) to route requests with the same session cookie or header to the same container instance.
- **Required Solution 2 (Enterprise Distributed)**: Replace the in-memory `sessionMap` with a distributed transport coordinator (e.g. Redis Pub/Sub for SSE event streams and Redis Key-Value store for session state).

---

## 4. Graceful Shutdown & Resource Management

AquaWatt registers handlers for `SIGINT` and `SIGTERM`:
```typescript
const shutdown = () => {
  console.log('[AquaWatt] Shutting down server...');
  server.close(() => {
    context.close(); // Closes background session timers, closes active SSE connections, closes Vite
    process.exit(0);
  });
};
```
1. Background session sweeper intervals (`cleanupInterval.unref()`) are cleared.
2. All active Streamable HTTP transports and MCP server sessions are cleanly closed.
3. No dangling event listeners or open HTTP sockets are left uncollected.

---

## 5. Security & Log Hygiene

1. **Zero Credential Logging**:
   The server never logs `Authorization` headers, Bearer JWTs, database connection strings, or service-role keys.
2. **Error Masking**:
   In production (`NODE_ENV=production`), internal database exceptions or stack traces are masked, returning generic error messages to clients while logging sanitized error details to server stderr.
3. **Hardware Boundary Defense**:
   All uncalibrated sensors (INA219 power, pressure, temperature) strictly return `null` in physical mode, eliminating any risk of fabricated telemetry in production reports.
