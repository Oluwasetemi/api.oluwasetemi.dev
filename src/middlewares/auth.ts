import type { Context, Next } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { AuthService, extractBearerToken } from "@/lib/auth";
import { getUserWithTimestamps } from "@/utils/time";

export type AuthVariables = {
  user: {
    id: string;
    email: string;
    name: string | null;
    imageUrl: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "Authorization token required",
      });
    }

    const payload = AuthService.verifyAccessToken(token);

    // Check if user is active (cached from JWT)
    if (!payload.isActive) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "Invalid or inactive user",
      });
    }

    // Fetch complete user data with actual timestamps
    const user = await getUserWithTimestamps(payload);

    if (!user) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "User not found or inactive",
      });
    }

    c.set("user", user);
    await next();
  }
  catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: "Invalid token",
    });
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = extractBearerToken(authHeader);

  // If no token provided, continue without setting user
  if (!token) {
    await next();
    return;
  }

  // If token provided, try to authenticate
  try {
    await authMiddleware(c, next);
  }
  catch {
    // If authentication fails, continue without user (don't throw)
    await next();
  }
}

export function requireAuth() {
  return authMiddleware;
}

export function optionalAuth() {
  return optionalAuthMiddleware;
}