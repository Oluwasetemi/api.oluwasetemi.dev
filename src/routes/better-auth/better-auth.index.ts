import { auth } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";

const router = createRouter();

router.on(["POST", "GET"], "/api/auth/*", c => auth.handler(c.req.raw));

export default router;
