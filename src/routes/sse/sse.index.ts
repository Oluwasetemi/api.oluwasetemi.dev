import { createRouter } from "@/lib/create-app";
import { optionalAuth } from "@/middlewares/auth";

import sseClient from "./sse-client";
import * as handlers from "./sse.handlers";
import * as routes from "./sse.routes";

const router = createRouter();

// Apply optional authentication to all SSE routes
router.use("*", optionalAuth());

// SSE endpoints
router
  .openapi(routes.tasksStream, handlers.tasksStream)
  .openapi(routes.productsStream, handlers.productsStream)
  .openapi(routes.postsStream, handlers.postsStream)
  .openapi(routes.commentsStream, handlers.commentsStream);

// Mount SSE test client
router.route("/", sseClient);

export default router;
