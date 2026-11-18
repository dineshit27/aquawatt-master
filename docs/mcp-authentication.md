# AquaWatt MCP — Authentication Architecture & Security Specification

This document details the authentication and authorization architecture implemented in the AquaWatt Model Context Protocol (MCP) server for Stage 6.

---

## 1. Architectural Model: OAuth 2.1 Protected Resource (RFC 9728)

AquaWatt MCP implements the **OAuth 2.1 / RFC 9728 Protected Resource** pattern defined in the official Model Context Protocol authorization specification:

```
┌────────────────────────────────┐
│       External MCP Client      │
│ (Claude Desktop, Cursor, SDK)  │
└────────┬──────────────┬────────┘
         │ (1)          │ (2)
         │ Obtains JWT  │ Sends Bearer JWT
         ▼              ▼
┌──────────────────┐  ┌───────────────────────────────────┐
│  Supabase Auth   │  │       AquaWatt MCP Platform       │
│  (Authorization  │  │         (Resource Server)         │
│     Server)      │  │                                   │
└──────────────────┘  │  - RFC 9728 Resource Metadata     │
                      │  - Cryptographic JWT Verification │
                      │  - User-Scoped Database Access    │
                      │  - PostgreSQL RLS Enforcement     │
                      └─────────────────┬─────────────────┘
                                        │ (3)
                                        │ Bearer JWT forwarded
                                        ▼
                      ┌───────────────────────────────────┐
                      │    Supabase PostgreSQL Engine    │
                      │        (RLS auth.uid())           │
                      └───────────────────────────────────┘
```

### Roles and Responsibilities
- **Resource Server (RS)**: AquaWatt MCP server (`/mcp`). Exposes tools, resources, and prompts. It does **not** issue credentials or manage passwords directly; instead, it enforces access control and validates incoming tokens.
- **Authorization Server (AS)**: Supabase Auth (`https://<project-ref>.supabase.co/auth/v1`). Authenticates users (via email/password, magic link, GitHub/Google OAuth, or custom JWTs) and issues signed cryptographic JWT access tokens.
- **Client**: Any MCP-compliant client (official `@modelcontextprotocol/sdk` client, Claude Desktop, Cursor IDE, MCP Inspector) acting on behalf of an authenticated user.

---

## 2. MCP Authorization Specification Compliance & Honest Assessment

### Where We Comply
1. **RFC 9728 Protected Resource Metadata**:
   - The server exposes standard discovery metadata at:
     - `GET /.well-known/oauth-protected-resource`
     - `GET /.well-known/oauth-protected-resource/mcp`
   - Advertises the authorization server (`https://<project-ref>.supabase.co/auth/v1`), supported scopes (`read:telemetry`, `read:devices`, `read:alerts`, `read:analytics`), bearer methods (`header`), and resource documentation.
2. **RFC 6750 / RFC 9728 `WWW-Authenticate` Challenges**:
   - When an unauthenticated or invalid token request arrives for a protected operation, the server responds with HTTP 401 and includes:
     ```http
     WWW-Authenticate: Bearer realm="AquaWatt MCP", error="invalid_token", error_description="Authentication required. Provide a valid Supabase JWT in the Authorization header.", resource_metadata="https://<host>/.well-known/oauth-protected-resource/mcp"
     ```
3. **Session Binding**:
   - Authenticated JWTs provided on initialization or subsequent calls bind the Streamable HTTP transport session (`mcp-session-id`) to that specific verified user identity.
4. **Explicit Session Termination**:
   - Supports `DELETE /mcp` with `mcp-session-id` header to cleanly close transport connections and evict session state.

### Exact Capability Classification
| Capability | Status | Implementation Boundary |
| :--- | :--- | :--- |
| **RFC 9728 Protected Resource Metadata** | **Implemented** | Endpoints `/.well-known/oauth-protected-resource` and `/mcp` serve standard RFC 9728 metadata declaring resource, authorization servers, supported scopes, and documentation. |
| **Supabase Bearer JWT Verification** | **Implemented** | All protected operations require `Authorization: Bearer <token>`. Verified cryptographically server-side. Returns RFC 6750 / RFC 9728 `WWW-Authenticate` challenge headers. |
| **OAuth AS Discovery** | **External (Delegated)** | The MCP server is a Resource Server (RS), not an Authorization Server (AS). It does not host `/.well-known/oauth-authorization-server`; clients query Supabase Auth directly. |
| **Authorization Code Flow with PKCE** | **Not Implemented on MCP Server** | The MCP server does not host interactive login or code grant endpoints. PKCE exchange occurs directly between client and Supabase Auth. |
| **Token Acquisition & Refresh** | **Not Implemented on MCP Server** | The MCP server validates tokens; token acquisition and refresh are managed by clients via Supabase Auth SDKs (`supabase.auth.refreshSession()`). |
| **Dynamic Client Registration (RFC 7591)** | **Not Implemented** | Not required by Supabase Auth; clients connect using project anon keys and user credentials. |
| **Scope Enforcement & Audience Validation** | **Partially Implemented** | Scopes (`read:telemetry`, `read:devices`, `read:alerts`, `read:analytics`) are advertised. User authorization is enforced through cryptographic user identity, device ownership validation, and PostgreSQL Row Level Security (RLS). |

### Practical Client Reality & OAuth Limitations
While the MCP authorization specification allows clients to perform in-band OAuth authorization code flows with PKCE, **virtually all current production MCP clients** (Claude Desktop, Cursor IDE, CLI tools) do not have embedded web browser engines capable of orchestrating external interactive OAuth popups inside their configuration shells. 

Instead, clients configure remote MCP servers by passing the pre-obtained Bearer JWT directly in HTTP request headers (`Authorization: Bearer <supabase-jwt>`).

**Accurate Classification**: AquaWatt MCP implements **Pre-obtained Supabase Bearer JWT Authentication with RFC 9728 Protected Resource Metadata Discovery**. It does **not** implement a standalone OAuth 2.1 Authorization Server, interactive PKCE browser redirection, or token issuance. Complete OAuth 2.1 compliance is not claimed.

---

## 3. Cryptographic Verification & Identity Derivation

### Strict Security Rules
1. **No Caller-Supplied Identity**:
   `AuthContext.userId` is **derived exclusively** from the verified Supabase JWT (`user.id` or `sub` claim). Request bodies, query parameters, resource URIs, and prompt arguments are **never** permitted to specify or override `userId`.
2. **Forwarding to PostgreSQL RLS**:
   The user's verified Bearer JWT is passed directly in the `Authorization` header to Supabase PostgreSQL queries. PostgreSQL's `auth.uid() = user_id` Row Level Security policies enforce device isolation at the database engine level.
3. **Zero Secrets in Tool Outputs**:
   Supabase service-role keys, anon keys, database passwords, and user JWTs are never returned in MCP tool outputs, resource texts, or prompt messages.
4. **Hardened Test Injections**:
   The test injection hooks (`setCustomSupabaseClient` and `setCustomVerifier`) actively verify `process.env.NODE_ENV !== 'production'` and throw explicit runtime errors if invoked in production mode.

---

## 4. Protected vs Public Operations

| Endpoint / Method | Access Level | Description |
| :--- | :--- | :--- |
| `GET /health` | Public | Server uptime, status, and active session count. |
| `GET /.well-known/oauth-protected-resource` | Public | RFC 9728 OAuth Protected Resource Metadata. |
| `POST /mcp` (`initialize`) | Public / Authenticated | Protocol handshake. If `Authorization` header is present, session is authenticated immediately. |
| `POST /mcp` (`tools/list`) | Public / Authenticated | Discovers registered tool schemas. |
| `POST /mcp` (`resources/list`) | Public / Authenticated | Discovers static resource URIs. |
| `POST /mcp` (`resources/templates/list`) | Public / Authenticated | Discovers dynamic resource templates. |
| `POST /mcp` (`prompts/list`) | Public / Authenticated | Discovers reusable prompt templates. |
| `POST /mcp` (`tools/call`) | **Protected** | Requires verified `AuthContext`. Denies cross-user device access. |
| `POST /mcp` (`resources/read`) | **Protected** | Requires verified `AuthContext`. Enforces device ownership. |
| `POST /mcp` (`prompts/get`) | **Protected** | Requires verified `AuthContext`. Enforces device ownership. |
| `DELETE /mcp` | **Session Owner** | Explicitly terminates session and frees server resources. |

---

## 5. Token Revocation and Expiration Handling

- **Token Expiry**: When a user's Supabase access token expires (typically after 1 hour), subsequent calls fail verification with HTTP 401.
- **Client Re-Authentication**: The client catches the 401 challenge, refreshes its access token via Supabase Auth (`supabase.auth.refreshSession()`), and supplies the new token in subsequent requests.
- **Session Cleanup**: If a client disconnects or becomes idle, the server's background session sweeper automatically evicts sessions older than `MCP_SESSION_TTL_MS` (default 30 minutes).
