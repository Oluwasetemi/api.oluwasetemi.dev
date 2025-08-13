import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import env from "@/env";

function getHttpStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    [HttpStatusCodes.BAD_REQUEST]: HttpStatusPhrases.BAD_REQUEST,
    [HttpStatusCodes.UNAUTHORIZED]: HttpStatusPhrases.UNAUTHORIZED,
    [HttpStatusCodes.FORBIDDEN]: HttpStatusPhrases.FORBIDDEN,
    [HttpStatusCodes.NOT_FOUND]: HttpStatusPhrases.NOT_FOUND,
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: HttpStatusPhrases.UNPROCESSABLE_ENTITY,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: HttpStatusPhrases.INTERNAL_SERVER_ERROR,
  };
  return statusTexts[status] || "Unknown Error";
}

export function createErrorHandler() {
  return async (err: Error, c: Context) => {
    if (err instanceof HTTPException) {
      // For HTTPExceptions, return the error without stack trace
      const message = err.message || getHttpStatusText(err.status);
      return c.json(
        {
          message,
          success: false,
          ...(env.NODE_ENV === "development" && { stack: err.stack }),
        },
        err.status,
      );
    }

    // For unexpected errors, log them but don't expose details in production
    console.error("Unexpected error:", err);

    const message = env.NODE_ENV === "production" || env.NODE_ENV === "test"
      ? "Internal Server Error"
      : err.message;

    return c.json(
      {
        message,
        success: false,
        ...(env.NODE_ENV === "development" && { stack: err.stack }),
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  };
}
