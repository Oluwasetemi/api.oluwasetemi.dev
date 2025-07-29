import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import env from "@/env";

export function createErrorHandler() {
  return async (err: Error, c: Context) => {
    if (err instanceof HTTPException) {
      // For HTTPExceptions, return the error without stack trace
      return c.json(
        {
          message: err.message,
          ...(env.NODE_ENV === "development" && { stack: err.stack }),
        },
        err.status,
      );
    }

    // For unexpected errors, log them but don't expose details in production
    console.error("Unexpected error:", err);

    const message = env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

    return c.json(
      {
        message,
        ...(env.NODE_ENV === "development" && { stack: err.stack }),
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  };
}
