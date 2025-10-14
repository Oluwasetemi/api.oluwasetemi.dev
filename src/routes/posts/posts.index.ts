import { createRouter } from "@/lib/create-app";
import { optionalAuth } from "@/middlewares/auth";

import * as handlers from "./posts.handlers"; // controllers
import * as routes from "./posts.routes"; // routes

const router = createRouter();

// Apply optional authentication to all posts routes
router.use("*", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getBySlug, handlers.getBySlug)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
