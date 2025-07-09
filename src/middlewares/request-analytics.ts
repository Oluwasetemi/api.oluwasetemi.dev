import type { Context, Next } from "hono";

import type { AppBindings } from "@/lib/types";

import env from "@/env";
import { logRequest } from "@/services/analytics.service";

/**
 * Middleware to track and log HTTP requests for analytics purposes.
 *
 * This middleware:
 * - Captures request start time
 * - Measures request duration
 * - Collects request metadata (method, path, status, etc.)
 * - Logs the request data asynchronously using AnalyticsService
 * - Includes fail-safe error handling
 */
export function analyticsLogger() {
  return async (ctx: Context<AppBindings>, next: Next) => {
    if (!env.ENABLE_ANALYTICS) {
      return next(); // Skip analytics if disabled
    }

    const startTime = Date.now();

    try {
      // Process the request
      await next();
    }
    finally {
      // Calculate duration regardless of success/failure
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Collect request metadata
      const requestData = {
        method: ctx.req.method,
        path: ctx.req.path,
        status: ctx.res.status,
        durationMs: duration,
        // Optional additional metadata
        ip: ctx.req.header("x-forwarded-for") || ctx.req.header("x-real-ip") || (ctx.env as any)?.CF_CONNECTING_IP,
        userAgent: ctx.req.header("user-agent"),
        referer: ctx.req.header("referer"),
      };

      // Log the request asynchronously with fail-safe error handling
      try {
        logRequest(requestData);
      }
      catch (error) {
        // Fail-safe: log error but don't break the request flow
        const logger = ctx.get("logger");
        if (logger) {
          logger.error(error, "Failed to log request analytics");
        }
        else {
          // Fallback to console if logger is not available
          console.error("Failed to log request analytics:", error);
        }
      }
    }
  };
}
