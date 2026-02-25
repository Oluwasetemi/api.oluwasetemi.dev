import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./posts.handlers";
import * as routes from "./posts.routes";

const router = createRouter();

// /posts/me must be registered before /posts/:id to avoid UUID validation on "me"
router.use("/posts/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

// Apply optional authentication to general posts routes
router.use("/posts", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getBySlug, handlers.getBySlug)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
