import type { Context, Next } from "hono";

import { rateLimiter } from "hono-rate-limiter";

import env from "@/env";

const defaultLimits = {
  api: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    message: { error: "Too many requests, please try again later." },
  },
  auth: {
    windowMs: 10 * 60 * 1000,
    limit: 10,
    message: { error: "Too many authentication attempts, please try again later." },
  },
  public: {
    windowMs: 1 * 60 * 1000,
    limit: 60,
    message: { error: "Rate limit exceeded for public endpoints." },
  },
  graphql: {
    windowMs: 15 * 60 * 1000,
    limit: 50,
    message: { error: "GraphQL rate limit exceeded, please try again later." },
  },
};

// Helper function to validate IP address format
function isValidIp(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/;
  // Basic IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^::1$|^::$/i;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Helper function to check if an IP is in trusted proxy list
function isTrustedProxy(ip: string): boolean {
  if (!env.RATE_LIMIT_TRUSTED_PROXIES)
    return false;

  const trustedIps = env.RATE_LIMIT_TRUSTED_PROXIES.split(",").map(ip => ip.trim());
  return trustedIps.includes(ip);
}

function keyGenerator(c: Context): string {
  const getClientIp = (): string | undefined => {
    if (!env.RATE_LIMIT_TRUST_PROXY) {
      // When proxy trust is disabled, try to get direct connection IP
      // Handle different runtime environments safely
      try {
        // Try Node.js-specific context
        const nodeReq = (c.req as any).raw;
        if (nodeReq?.socket?.remoteAddress) {
          const ip = nodeReq.socket.remoteAddress;
          if (ip && isValidIp(ip)) {
            return ip;
          }
        }

        // Try other potential runtime-specific IP sources
        // Some environments may expose connection info differently
        const env = (c as any).env;
        if (env?.CF_CONNECTING_IP && isValidIp(env.CF_CONNECTING_IP)) {
          return env.CF_CONNECTING_IP;
        }

        // Try request context that might be available in some runtimes
        const requestContext = (c.req as any).requestContext;
        if (requestContext?.remoteAddress && isValidIp(requestContext.remoteAddress)) {
          return requestContext.remoteAddress;
        }
      }
      catch (error) {
        // Silently handle errors in IP extraction to prevent crashes
        console.warn("Failed to extract direct client IP:", error);
      }

      // No fallback to proxy headers when trust is disabled
      return undefined;
    }

    // When proxy trust is enabled, validate the proxy chain
    let directConnectionIp: string | undefined;

    try {
      // Get the direct connection IP first
      const nodeReq = (c.req as any).raw;
      if (nodeReq?.socket?.remoteAddress) {
        directConnectionIp = nodeReq.socket.remoteAddress;
      }
    }
    catch (error) {
      console.warn("Failed to extract direct connection IP for proxy validation:", error);
    }

    // Only trust proxy headers if we're actually behind a trusted proxy
    if (directConnectionIp && isTrustedProxy(directConnectionIp)) {
      // We're behind a trusted proxy, check proxy headers in priority order
      const forwarded = c.req.header("x-forwarded-for");
      const realIp = c.req.header("x-real-ip");
      const cfConnecting = c.req.header("cf-connecting-ip");

      const forwardedIp = forwarded?.split(",")[0]?.trim();

      const candidateIps = [forwardedIp, realIp, cfConnecting].filter(Boolean);
      const validIp = candidateIps.find(ip => ip && isValidIp(ip));

      if (validIp) {
        return validIp;
      }
    }

    // Fallback: use direct connection IP if available (with error handling)
    if (directConnectionIp && isValidIp(directConnectionIp)) {
      return directConnectionIp;
    }

    return undefined;
  };

  const clientIp = getClientIp();

  if (clientIp) {
    return clientIp;
  }

  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function skip(c: Context): boolean {
  if (env.NODE_ENV === "development") {
    return true;
  }

  const path = c.req.path;
  if (path === "/" || path === "/health") {
    return true;
  }

  if (path === "/graphql" || path === "/playground") {
    return true;
  }

  return false;
}

// eslint-disable-next-line unused-imports/no-unused-vars
function skipGraphQL(c: Context): boolean {
  if (env.NODE_ENV === "development") {
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
  // Environment-configurable options for skipping requests based on response status
  skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS, // Skip counting successful requests (2xx, 3xx)
  skipFailedRequests: env.RATE_LIMIT_SKIP_FAILED_REQUESTS, // Skip counting failed requests (4xx, 5xx)
});

export const authRateLimiter = rateLimiter({
  windowMs: defaultLimits.auth.windowMs,
  limit: defaultLimits.auth.limit,
  message: defaultLimits.auth.message,
  keyGenerator,
  // eslint-disable-next-line unused-imports/no-unused-vars
  skip: (c: Context) => env.NODE_ENV === "development", // Don't skip auth limits in production
  skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
  skipFailedRequests: env.RATE_LIMIT_SKIP_FAILED_REQUESTS,
});

export const publicRateLimiter = rateLimiter({
  windowMs: defaultLimits.public.windowMs,
  limit: defaultLimits.public.limit,
  message: defaultLimits.public.message,
  keyGenerator,
  skip,
  skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
  skipFailedRequests: env.RATE_LIMIT_SKIP_FAILED_REQUESTS,
});

export const graphqlRateLimiter = rateLimiter({
  windowMs: defaultLimits.graphql.windowMs,
  limit: defaultLimits.graphql.limit,
  message: defaultLimits.graphql.message,
  keyGenerator,
  skip: skipGraphQL, // Use dedicated GraphQL skip function
  skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
  skipFailedRequests: env.RATE_LIMIT_SKIP_FAILED_REQUESTS,
});

// Custom middleware to add rate limit headers
export function rateLimitHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    // Add rate limit info to response headers (if available)
    const remaining = c.get("rateLimit-remaining");
    const limit = c.get("rateLimit-limit");
    const resetTime = c.get("rateLimit-reset");

    if (remaining !== undefined) {
      c.header("X-RateLimit-Remaining", remaining.toString());
    }
    if (limit !== undefined) {
      c.header("X-RateLimit-Limit", limit.toString());
    }
    if (resetTime !== undefined) {
      c.header("X-RateLimit-Reset", resetTime.toString());
    }
  };
}
