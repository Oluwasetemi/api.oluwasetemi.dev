import { pinoLogger as honoLogger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";

import env from "@/env";

/**
 * Shared pino logger instance for use throughout the application.
 * Uses structured logging with pretty-printing in development and JSON in all other environments.
 */
export const logger = pino(
  { level: env.LOG_LEVEL || "info" },
  env.NODE_ENV === "development" ? pretty() : undefined,
);

export function pinoLogger() {
  return honoLogger({
    pino: logger,
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
