import { createRouter } from "@/lib/create-app";

import * as handlers from "./analytics.handlers";
import * as routes from "./analytics.routes";

const router = createRouter()
  .openapi(routes.getRequests, handlers.getRequests)
  .openapi(routes.getCounts, handlers.getCounts);

export default router;
