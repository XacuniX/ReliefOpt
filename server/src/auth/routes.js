import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { AuthenticationError } from "./service.js";

function validCredentials(body) {
  return (
    typeof body?.username === "string" &&
    body.username.trim().length > 0 &&
    body.username.length <= 100 &&
    typeof body?.password === "string" &&
    body.password.length > 0 &&
    body.password.length <= 256
  );
}

export function createAuthRouter({ authService, requireAuth, rateLimitWindowMs, rateLimitMax }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." },
  });

  router.post("/login", loginLimiter, async (request, response) => {
    if (!validCredentials(request.body)) {
      response.status(400).json({ error: "Username and password are required." });
      return;
    }

    try {
      const session = await authService.authenticate(request.body.username, request.body.password);
      response.json(session);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        response.status(401).json({ error: "Invalid username or password." });
        return;
      }
      throw error;
    }
  });

  router.get("/me", requireAuth, (request, response) => {
    response.json({ user: request.auth.user });
  });

  return router;
}
