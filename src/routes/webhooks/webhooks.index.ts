import { createRouter } from "@/lib/create-app";
import { optionalAuth } from "@/middlewares/optional-auth";

import * as handlers from "./webhooks.handlers";
import * as routes from "./webhooks.routes";

const router = createRouter();

// Apply optional auth middleware to all routes
router.use("*", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.test, handlers.test)
  .openapi(routes.listEvents, handlers.listEvents)
  .openapi(routes.retryEvent, handlers.retryEvent);

export default router;
