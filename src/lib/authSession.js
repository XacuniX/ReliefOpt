export const SESSION_KEY = "reliefopt-session";
const VALID_ROLES = new Set(["central_admin", "warehouse_manager", "field_worker"]);

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return decodeURIComponent(
    Array.from(atob(padded), (character) =>
      `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
    ).join(""),
  );
}

export function sessionFromAccessToken(accessToken, now = Date.now()) {
  try {
    if (typeof accessToken !== "string") return null;
    const parts = accessToken.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;
    const claims = JSON.parse(decodeBase64Url(parts[1]));
    if (
      typeof claims.sub !== "string" || !claims.sub.trim() ||
      typeof claims.username !== "string" || !claims.username.trim() ||
      typeof claims.name !== "string" || !claims.name.trim() ||
      !VALID_ROLES.has(claims.role) ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= now
    ) {
      return null;
    }
    return {
      accessToken,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      user: {
        id: claims.sub,
        username: claims.username,
        name: claims.name,
        role: claims.role,
      },
    };
  } catch {
    return null;
  }
}

export function readCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return sessionFromAccessToken(stored?.accessToken);
  } catch {
    return null;
  }
}

export function writeCachedSession(accessToken) {
  const session = sessionFromAccessToken(accessToken);
  if (!session) throw new Error("Cannot cache an invalid or expired access token.");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken }));
  return session;
}

export function clearCachedSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // The in-memory session is still cleared by AuthContext.
  }
}
