import { createRouter } from "@/lib/create-app";

import landingPage from "./index/index.page";

const router = createRouter();

// Mount the landing page
router.route("/", landingPage);

// Keep JSON API endpoint for programmatic access
// router.openapi(
//   createRoute({
//     tags: ["Index"],
//     method: "get",
//     path: "/api",
//     summary: "Get the API status",
//     description: "Get the API status (JSON response)",
//     responses: {
//       [HttpStatusCodes.OK]: jsonContent(
//         createMessageObjectSchema("API by OLUWASETEMI"),
//         "API by OLUWASETEMI",
//       ),
//     },
//   }),
//   (c) => {
//     return c.json(
//       {
//         message: "API.OLUWASETEMI.DEV",
//       },
//       HttpStatusCodes.OK,
//     );
//   },
// );

export default router;
