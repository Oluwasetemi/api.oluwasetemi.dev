import { createRouter } from "@/lib/create-app";
import { optionalAuth } from "@/middlewares/auth";

import * as handlers from "./comments.handlers";
import * as routes from "./comments.routes";

const router = createRouter();

// Apply optional authentication - authenticated users get priority, anonymous allowed
router.use("*", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
