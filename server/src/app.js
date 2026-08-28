import express from "express";
import cors from "cors";
import { OAuth2Client } from "google-auth-library";
import { createAuthRouter } from "./auth/routes.js";
import { allowRoles, createRequireAuth } from "./auth/middleware.js";
import { AuthService, JwtService } from "./auth/service.js";
import { UserAuthRepository } from "./db/repository.js";
import { createTeamRouter, createUserRouter } from "./users/routes.js";
import { UserManagementService } from "./users/service.js";
import { createWarehouseRouter } from "./warehouses/routes.js";
import { WarehouseManagementService } from "./warehouses/service.js";
import { createSyncRouter } from "./sync/routes.js";
import { SyncError, SyncService } from "./sync/service.js";

export function createApp({
  db,
  config,
  version = "0.1.0",
  logger = console,
  googleClient = new OAuth2Client(),
}) {
  if (!db?.query)
    throw new Error("createApp requires a database with a query method.");
  if (!config?.jwtSecret || !config?.googleClientId)
    throw new Error("createApp requires authentication configuration.");

  const app = express();
  const userRepository = new UserAuthRepository(db);
  const jwtService = new JwtService({
    secret: config.jwtSecret,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresInSeconds: config.jwtExpiresInSeconds,
  });
  const userManagementService = new UserManagementService({
    db,
    bcryptRounds: config.bcryptRounds,
    passwordMinLength: config.passwordMinLength,
  });
  const authService = new AuthService({
    userRepository,
    userManagementService,
    jwtService,
    googleClient,
    googleClientId: config.googleClientId,
    bcryptRounds: config.bcryptRounds,
    passwordMinLength: config.passwordMinLength,
  });
  const requireAuth = createRequireAuth({ jwtService, userRepository });
  const requireAdmin = allowRoles("central_admin");
  const requireWarehouseManage = allowRoles("central_admin", "warehouse_manager");
  const warehouseManagementService = new WarehouseManagementService({ db });
  const syncService = new SyncService(db);

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.clientOrigins.includes(origin))
          return callback(null, true);
        const error = new Error("Origin is not allowed.");
        error.code = "CORS_ORIGIN_DENIED";
        return callback(error);
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_request, response) => {
    response.json({ service: "reliefopt-central-command", version });
  });

  app.get("/health/live", (_request, response) => {
    response.json({
      status: "ok",
      service: "reliefopt-central-command",
      version,
    });
  });

  app.get("/health/ready", async (_request, response) => {
    try {
      await db.query("SELECT 1 AS ready");
      const snapshot = await db.query(
        "SELECT snapshot_seq FROM snapshot_meta WHERE singleton = TRUE",
      );
      if (snapshot.rowCount !== 1)
        throw new Error("Snapshot metadata is not initialized.");
      response.json({
        status: "ready",
        database: "connected",
        snapshotSeq: Number(snapshot.rows[0].snapshot_seq),
      });
    } catch (error) {
      logger.error?.("Readiness check failed", error);
      response
        .status(503)
        .json({ status: "not_ready", database: "unavailable" });
    }
  });

  app.use(
    "/api/auth",
    createAuthRouter({
      authService,
      requireAuth,
      rateLimitWindowMs: config.loginRateLimitWindowMs,
      rateLimitMax: config.loginRateLimitMax,
    }),
  );
  app.use(
    "/api/users",
    createUserRouter({
      service: userManagementService,
      requireAuth,
      requireAdmin,
    }),
  );
  app.use(
    "/api/teams",
    createTeamRouter({
      service: userManagementService,
      requireAuth,
      requireAdmin,
    }),
  );
  app.use(
    "/api/warehouses",
    createWarehouseRouter({
      service: warehouseManagementService,
      requireAuth,
      requireWarehouseManage,
    }),
  );
  app.use(
    "/api",
    createSyncRouter({ service: syncService, requireAuth, requireAdmin }),
  );

  app.get(
    "/api/admin/ping",
    requireAuth,
    allowRoles("central_admin"),
    (request, response) =>
      response.json({ status: "ok", role: request.auth.user.role }),
  );

  app.get(
    "/api/warehouse/ping",
    requireAuth,
    allowRoles("central_admin", "warehouse_manager"),
    (request, response) =>
      response.json({ status: "ok", role: request.auth.user.role }),
  );

  app.use((_request, response) => {
    response.status(404).json({ error: "Not found" });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyncError) {
      response
        .status(error.status)
        .json({ error: error.message, code: error.code });
      return;
    }
    if (error?.type === "entity.parse.failed") {
      response
        .status(400)
        .json({
          error: "Malformed JSON request body.",
          code: "MALFORMED_JSON",
        });
      return;
    }
    if (error?.type === "entity.too.large") {
      response
        .status(413)
        .json({
          error: "Request body is too large.",
          code: "PAYLOAD_TOO_LARGE",
        });
      return;
    }
    if (error?.code === "CORS_ORIGIN_DENIED") {
      response
        .status(403)
        .json({ error: "Origin is not allowed.", code: error.code });
      return;
    }
    if (["23514", "22P02"].includes(error?.code)) {
      response
        .status(400)
        .json({ error: "Invalid request data.", code: "VALIDATION_ERROR" });
      return;
    }
    logger.error?.("Unhandled request error", error);
    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}
