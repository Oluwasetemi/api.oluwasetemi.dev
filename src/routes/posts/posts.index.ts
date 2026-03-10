import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./posts.handlers";
import * as routes from "./posts.routes";

const router = createRouter();

// Apply optional authentication to ALL routes in this router
router.use("*", optionalAuth());

// /posts/me must be registered before /posts/:id to avoid UUID validation on "me"
// requireAuth will be applied on top of optionalAuth
router.use("/posts/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getBySlug, handlers.getBySlug)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
