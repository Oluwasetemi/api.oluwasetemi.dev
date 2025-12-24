import { logger } from "@/middlewares/pino-logger";

/**
 * Handle unhandled promise rejections
 * @param {unknown} reason  reason for the unhandledRejection exception
 * @param {Promise<unknown>} promise  promise
 */
export function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error({ error: message, stack, promise }, "Unhandled Promise Rejection");
}

/**
 * Handle uncaught exceptions
 * @param {Error} error
 */
export function handleUncaughtException(error: Error) {
  logger.error({ error: error.message, stack: error.stack }, "Uncaught Exception");
}
