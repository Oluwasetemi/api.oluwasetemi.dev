import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./products.handlers";
import * as routes from "./products.routes";

const router = createRouter();

// Apply optional authentication to ALL routes in this router
router.use("*", optionalAuth());

// /products/me must be registered before /products/:id to avoid UUID validation on "me"
// requireAuth will be applied on top of optionalAuth
router.use("/products/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
