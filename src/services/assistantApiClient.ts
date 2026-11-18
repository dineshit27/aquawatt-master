/**
 * AquaWatt Built-in Dashboard AI Assistant API Client
 * 
 * Communicates with the authenticated POST /api/assistant/chat endpoint.
 * Derives user credentials from active Supabase sessions or authorized bearer tokens.
 */
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  retrievedToolCalls?: string[];
  hardwareBoundaryNotes?: string[];
  structuredData?: unknown;
}

export interface AssistantChatRequest {
  message: string;
  deviceId?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AssistantChatResponse {
  status: 'success';
  reply: string;
  data?: unknown;
  retrievedToolCalls: string[];
  hardwareBoundaryNotes: string[];
  timestamp: string;
}

export interface AssistantApiError {
  status: 'error';
  code: string;
  message: string;
  errors?: unknown;
}

// Optional dev token storage for environments without active Supabase email login
let devBearerToken: string | null = null;

export const setDevBearerToken = (token: string | null) => {
  devBearerToken = token;
  if (token) {
    sessionStorage.setItem('aquawatt_assistant_token', token);
  } else {
    sessionStorage.removeItem('aquawatt_assistant_token');
  }
};

export const getStoredBearerToken = (): string | null => {
  if (devBearerToken) return devBearerToken;
  try {
    return sessionStorage.getItem('aquawatt_assistant_token');
  } catch {
    return null;
  }
};

/**
 * Resolves the currently active bearer token for API calls.
 */
export async function getActiveAuthToken(): Promise<string | null> {
  // 1. Try Supabase session
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch (err) {
      console.warn('[AssistantClient] Supabase session retrieval failed:', err);
    }
  }

  // 2. Fall back to session-stored token
  return getStoredBearerToken();
}

/**
 * Sends a chat message to the server-side assistant endpoint.
 */
export async function sendAssistantMessage(
  payload: AssistantChatRequest,
  tokenOverride?: string
): Promise<AssistantChatResponse> {
  const token = tokenOverride || (await getActiveAuthToken());

  if (!token) {
    throw new Error(
      'Authentication required: No active session found. Please sign in or provide a valid Bearer JWT to access the assistant.'
    );
  }

  const response = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  if (!response.ok || body.status !== 'success') {
    const errorBody = body as AssistantApiError;
    const errorMsg = errorBody.message || `Request failed with HTTP ${response.status}`;
    const err = new Error(errorMsg);
    (err as unknown as { code: string }).code = errorBody.code || 'UNKNOWN_ERROR';
    throw err;
  }

  return body as AssistantChatResponse;
}
