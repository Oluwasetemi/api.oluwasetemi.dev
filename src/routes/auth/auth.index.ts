import { createRouter } from "@/lib/create-app";
import { requireAuth } from "@/middlewares/auth";
import { authRateLimiter } from "@/middlewares/rate-limiter";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

const router = createRouter();

// Apply auth-specific rate limiting to sensitive endpoints
router.use("/auth/register", authRateLimiter);
router.use("/auth/login", authRateLimiter);
router.use("/auth/refresh", authRateLimiter);

router
  .openapi(routes.register, handlers.register)
  .openapi(routes.login, handlers.login)
  .openapi(routes.refresh, handlers.refresh);

router.use("/auth/me", requireAuth());
router.openapi(routes.me, handlers.me);

export default router;
