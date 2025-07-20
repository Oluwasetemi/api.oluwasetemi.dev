import type { Schema } from "hono";

import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { pinoLogger } from "@/middlewares/pino-logger";
import { apiRateLimiter, rateLimitHeaders } from "@/middlewares/rate-limiter";
import { analyticsLogger } from "@/middlewares/request-analytics";
import { apiSecurityHeaders } from "@/middlewares/security-headers";

import type { AppBindings, AppOpenAPI } from "./types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use(requestId())
    .use(apiSecurityHeaders) // Security headers first
    .use(apiRateLimiter) // Rate limiting
    .use(rateLimitHeaders()) // Rate limit headers
    .use(analyticsLogger())
    .use(serveEmojiFavicon("📝"))
    .use(pinoLogger())
    .use(cors());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router);
}
