import { createRouter } from "@/lib/create-app";

import * as handlers from "./tasks.handlers"; // controllers
import * as routes from "./tasks.routes"; // routes

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.listChildren, handlers.listChildren)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  // .openapi(routes.patchComplete, handlers.patchComplete)
  .openapi(routes.remove, handlers.remove);

export default router;
