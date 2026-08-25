import { publicUser } from "./service.js";

function bearerToken(request) {
  const header = request.get("authorization");
  const match = /^Bearer\s+([^\s]+)$/i.exec(header || "");
  return match?.[1] ?? null;
}

export function createRequireAuth({ jwtService, userRepository }) {
  return async function requireAuth(request, response, next) {
    const token = bearerToken(request);
    if (!token) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    try {
      const claims = jwtService.verify(token);
      const user = await userRepository.findById(claims.sub);
      if (
        !user ||
        user.status === "Inactive" ||
        !Number.isInteger(claims.av) ||
        claims.av !== user.auth_version
      ) {
        response.status(401).json({ error: "Authentication required." });
        return;
      }
      request.auth = { claims, token, user: publicUser(user) };
      next();
    } catch {
      response.status(401).json({ error: "Authentication required." });
    }
  };
}

export function allowRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles);
  return function authorizeRole(request, response, next) {
    if (!request.auth?.user || !allowed.has(request.auth.user.role)) {
      response.status(403).json({ error: "Forbidden." });
      return;
    }
    next();
  };
}
