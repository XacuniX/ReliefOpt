import { Router } from "express";
import { UserManagementError } from "./service.js";

function route(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof UserManagementError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  };
}

export function createUserRouter({ service, requireAuth, requireAdmin }) {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get("/", route(async (_request, response) => {
    response.json({ users: await service.listUsers() });
  }));

  router.post("/", route(async (request, response) => {
    const user = await service.createUser(request.body);
    response.status(201).json({ user });
  }));

  router.patch("/:id", route(async (request, response) => {
    const user = await service.updateUser(request.params.id, request.body, request.auth.user);
    response.json({ user });
  }));

  router.post("/:id/deactivate", route(async (request, response) => {
    const user = await service.deactivateUser(request.params.id, request.auth.user);
    response.json({ user });
  }));

  router.post("/:id/reset-password", route(async (request, response) => {
    response.json(await service.resetPassword(request.params.id, request.body?.password));
  }));

  return router;
}

export function createTeamRouter({ service, requireAuth, requireAdmin }) {
  const router = Router();
  router.use(requireAuth, requireAdmin);
  router.get("/", route(async (_request, response) => {
    response.json({ teams: await service.listTeams() });
  }));

  router.post("/", route(async (request, response) => {
    const team = await service.createTeam(request.body);
    response.status(201).json({ team });
  }));

  router.delete("/:id", route(async (request, response) => {
    response.json(await service.deleteTeam(request.params.id));
  }));

  return router;
}
