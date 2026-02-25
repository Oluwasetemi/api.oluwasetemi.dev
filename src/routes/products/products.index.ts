import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./products.handlers";
import * as routes from "./products.routes";

const router = createRouter();

// /products/me must be registered before /products/:id to avoid UUID validation on "me"
router.use("/products/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

// Apply optional authentication to general product routes
router.use("/products", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
