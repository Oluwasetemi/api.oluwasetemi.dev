import type { Context, Next } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { AuthService, extractBearerToken } from "@/lib/auth";
import { getUserWithTimestamps } from "@/utils/time";

export type AuthVariables = {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
};

/**
 * Authenticates the incoming request by verifying a bearer access token and attaching the resolved user to the context.
 *
 * If authentication succeeds the middleware sets the authenticated user on the context under the `user` key and invokes `next`.
 *
 * @param c - Hono request context; the authenticated user will be attached as `c.get('user')` / `c.set('user', ...)`.
 * @param next - Next middleware or route handler to call after successful authentication.
 * @throws HTTPException with HTTP 401 and message "Authorization token required" when no bearer token is provided.
 * @throws HTTPException with HTTP 401 and message "Invalid or inactive user" when the token payload indicates the user is inactive.
 * @throws HTTPException with HTTP 401 and message "User not found or inactive" when the user lookup fails or the user is inactive.
 * @throws HTTPException with HTTP 401 and message "Invalid token" for other token verification errors.
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "Authorization token required",
      });
    }

    const payload = await AuthService.verifyAccessToken(token);

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