const API_BASE_URL = (import.meta.env?.VITE_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
const AUTH_TIMEOUT_MS = Number(import.meta.env?.VITE_AUTH_TIMEOUT_MS) || 8000;

export class AuthApiError extends Error {
  constructor(message, { status = 0, code = "AUTH_REQUEST_FAILED" } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(path, options = {}) {
  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new AuthApiError("Central Command is unreachable.", { code: "NETWORK_UNAVAILABLE" });
  } finally {
    window.clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthApiError(body.error || "Request failed.", {
      status: response.status,
      code: body.code || (response.status === 401 ? "INVALID_SESSION" : "REQUEST_FAILED"),
    });
  }
  return body;
}

export function loginWithPassword(username, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function fetchCurrentUser(accessToken) {
  return apiRequest("/api/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function registerAccount(payload) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOwnAccount(accessToken, payload) {
  return apiRequest("/api/auth/me", {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}
