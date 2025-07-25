import type { Context, Next } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { AuthService, extractBearerToken } from "@/lib/auth";

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
  const authHeader = c.req.header("Authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: "Authentication required",
    });
  }

  try {
    const payload = AuthService.verifyAccessToken(token);

    // Check if user is active (cached from JWT)
    if (!payload.isActive) {
      throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
        message: "Invalid or inactive user",
      });
    }

    // Use cached user data from JWT (no database lookup needed!)
    const user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      imageUrl: payload.imageUrl,
      isActive: payload.isActive,
      lastLoginAt: null, // Not cached in JWT for security
      createdAt: new Date(), // Placeholder
      updatedAt: new Date(), // Placeholder
    };

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

export function requireAuth() {
  return authMiddleware;
}
