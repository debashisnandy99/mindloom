import { Router } from "express";
import type { ZodType } from "zod";
import type { ToolHandlers } from "../../controllers/tools/toolController.factory.js";
import { validate } from "../../middlewares/validate.middleware.js";

export interface ToolRouterConfig {
  handlers: ToolHandlers;
  /** Full-artifact replace payload used by POST and PUT. */
  upsertSchema: ZodType;
  items?: {
    /** Path segment for the child collection, e.g. `nodes`. */
    path: string;
    /** Route param name, e.g. `nodeId`. */
    param: string;
    createSchema: ZodType;
    updateSchema: ZodType;
  };
}

/**
 * Mounts a consistent CRUD surface for one tool. Parent routers already
 * apply `requireAuth` and `loadNotebook`, so ownership is settled by the
 * time these handlers run.
 */
export function createToolRouter(config: ToolRouterConfig): Router {
  const router = Router({ mergeParams: true });
  const { handlers, upsertSchema, items } = config;

  router.get("/", handlers.show);
  router.post("/", validate({ body: upsertSchema }), handlers.upsert);
  router.put("/", validate({ body: upsertSchema }), handlers.upsert);
  router.delete("/", handlers.destroy);

  if (items) {
    router.post(
      `/${items.path}`,
      validate({ body: items.createSchema }),
      handlers.addItem,
    );
    router.patch(
      `/${items.path}/:${items.param}`,
      validate({ body: items.updateSchema }),
      handlers.updateItem,
    );
    router.delete(`/${items.path}/:${items.param}`, handlers.removeItem);
  }

  return router;
}
