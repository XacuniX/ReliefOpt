import { Router } from "express";
import { WarehouseManagementError } from "./service.js";

function route(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof WarehouseManagementError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  };
}

export function createWarehouseRouter({ service, requireAuth, requireWarehouseManage }) {
  const router = Router();
  router.use(requireAuth, requireWarehouseManage);

  router.get("/", route(async (_request, response) => {
    response.json({ warehouses: await service.listWarehouses() });
  }));

  router.post("/", route(async (request, response) => {
    const warehouse = await service.createWarehouse(request.body);
    response.status(201).json({ warehouse });
  }));

  return router;
}
