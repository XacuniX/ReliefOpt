import { Router } from "express";
import { SyncError } from "./service.js";

function route(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof SyncError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  };
}

export function createSyncRouter({ service, requireAuth, requireAdmin }) {
  const router = Router();
  router.use(requireAuth);

  router.get("/snapshot", route(async (_request, response) => {
    response.json(await service.snapshot());
  }));

  router.post("/proposals", route(async (request, response) => {
    const result = await service.submit(request.body, request.auth.user);
    response.status(result.duplicate ? 200 : 201).json(result);
  }));

  router.get("/proposals", requireAdmin, route(async (_request, response) => {
    response.json({ proposals: await service.list() });
  }));

  router.post("/proposals/:id/decision", requireAdmin, route(async (request, response) => {
    response.json(await service.decide(request.params.id, request.body, request.auth.user));
  }));

  router.post("/authoritative/mutations", requireAdmin, route(async (request, response) => {
    response.json(await service.direct(request.body?.type, request.body?.payload, request.auth.user));
  }));

  return router;
}
