import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./tasks.handlers"; // controllers
import * as routes from "./tasks.routes"; // routes

const router = createRouter();

// /tasks/me must be registered before /tasks/:id to avoid UUID validation on "me"
router.use("/tasks/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

// Apply optional authentication to general tasks routes
router.use("/tasks", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  // .openapi(routes.patchComplete, handlers.patchComplete)
  .openapi(routes.remove, handlers.remove);

// Children routes
router.openapi(routes.listChildren, handlers.listChildren);

export default router;
