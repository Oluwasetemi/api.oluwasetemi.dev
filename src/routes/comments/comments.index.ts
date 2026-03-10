import { createRouter } from "@/lib/create-app";
import { optionalAuth, requireAuth } from "@/middlewares/auth";

import * as handlers from "./comments.handlers";
import * as routes from "./comments.routes";

const router = createRouter();

// /posts/:postId/comments/me registered before list to ensure explicit match
router.use("/posts/:postId/comments/me", requireAuth());
router.openapi(routes.listMy, handlers.listMy);

// Apply optional authentication — authenticated users get priority, anonymous allowed
router.use("*", optionalAuth());

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
