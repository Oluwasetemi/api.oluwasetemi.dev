import { createRouter } from "@/lib/create-app";
import { optionalAuth } from "@/middlewares/auth";

import * as handlers from "./tasks.handlers"; // controllers
import * as routes from "./tasks.routes"; // routes

const router = createRouter();

// Apply optional authentication to all tasks routes
router.use("*", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.listChildren, handlers.listChildren)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  // .openapi(routes.patchComplete, handlers.patchComplete)
  .openapi(routes.remove, handlers.remove);

export default router;
