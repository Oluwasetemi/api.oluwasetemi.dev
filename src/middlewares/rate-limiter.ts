import type { Context, Next } from "hono";

import { rateLimiter } from "hono-rate-limiter";

import env from "@/env";

const defaultLimits = {
  api: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    message: { error: "Too many requests, please try again later." },
  },
};

function keyGenerator(c: Context): string {
  // For development, use localhost IP
  if (env.NODE_ENV === "development") {
    return "127.0.0.1";
  }

  // Extract IP address from headers (production)
  const forwardedFor = c.req.header("x-forwarded-for");
  const realIp = c.req.header("x-real-ip");
  const cfConnectingIp = c.req.header("cf-connecting-ip");

  // Use the first available IP address
  return forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown";
}

function skip(c: Context): boolean {
  // Check if rate limiting is globally disabled
  if (!env.RATE_LIMIT_ENABLED) {
    return true;
  }

  const path = c.req.path;
  if (path === "/") {
    return true;
  }

  if (path === "/graphql" || path === "/playground") {
    return true;
  }

  return false;
}

export const apiRateLimiter = rateLimiter({
  windowMs: defaultLimits.api.windowMs,
  limit: defaultLimits.api.limit,
  message: defaultLimits.api.message,
  keyGenerator,
  skip,
});

export const authRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: { error: "Too many authentication attempts, please try again later." },
  keyGenerator,
  // eslint-disable-next-line unused-imports/no-unused-vars
  skip: (c: Context) => !env.RATE_LIMIT_ENABLED,
});

export const publicRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  message: { error: "Rate limit exceeded for public endpoints." },
  keyGenerator,
  skip,
});

export const graphqlRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: { error: "GraphQL rate limit exceeded, please try again later." },
  keyGenerator,
  // eslint-disable-next-line unused-imports/no-unused-vars
  skip: (c: Context) => !env.RATE_LIMIT_ENABLED,
});

export function rateLimitHeaders() {
  return async (c: Context, next: Next) => {
    await next();
  };
}
