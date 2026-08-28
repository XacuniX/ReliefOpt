import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  AccountUpdateError,
  AuthenticationError,
  GoogleAuthenticationError,
} from "./service.js";
import { UserManagementError } from "../users/service.js";

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

function validGoogleCredential(body) {
  return (
    typeof body?.credential === "string" &&
    body.credential.length > 0 &&
    body.credential.length <= 20_000
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
  const registerLimiter = rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many registration attempts. Try again later." },
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

  router.post("/google", loginLimiter, async (request, response) => {
    if (!validGoogleCredential(request.body)) {
      response.status(400).json({
        error: "A Google credential is required.",
        code: "GOOGLE_CREDENTIAL_REQUIRED",
      });
      return;
    }

    try {
      const session = await authService.authenticateWithGoogle(request.body.credential);
      response.json(session);
    } catch (error) {
      if (error instanceof GoogleAuthenticationError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  router.post("/register", registerLimiter, async (request, response) => {
    try {
      const session = await authService.register(request.body);
      response.status(201).json(session);
    } catch (error) {
      if (error instanceof UserManagementError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  router.get("/me", requireAuth, (request, response) => {
    response.json({ user: request.auth.user });
  });

  router.patch("/me", requireAuth, async (request, response) => {
    try {
      const result = await authService.updateOwnAccount(request.auth.user.id, request.body);
      response.json(result);
    } catch (error) {
      if (error instanceof AccountUpdateError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      if (error instanceof AuthenticationError) {
        response.status(401).json({ error: "Authentication required." });
        return;
      }
      throw error;
    }
  });

  return router;
}
