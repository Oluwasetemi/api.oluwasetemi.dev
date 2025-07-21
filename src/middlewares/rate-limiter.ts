import type { Context, Next } from "hono";

import { rateLimiter } from "hono-rate-limiter";

import env from "@/env";

// Default rate limiting configuration
const defaultLimits = {
  // General API rate limit
  api: {
    windowMs: env.RATE_LIMIT_WINDOW_MS, // configurable window
    limit: env.RATE_LIMIT_MAX_REQUESTS, // configurable limit
    message: { error: "Too many requests, please try again later." },
  },
  // Stricter limits for auth endpoints (when implemented)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // limit each IP to 5 requests per windowMs
    message: { error: "Too many authentication attempts, please try again later." },
  },
  // More lenient for health checks and docs
  public: {
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 60, // 60 requests per minute
    message: { error: "Rate limit exceeded for public endpoints." },
  },
  // GraphQL specific limits
  graphql: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50, // limit GraphQL requests
    message: { error: "GraphQL rate limit exceeded, please try again later." },
  },
};

// Helper function to validate IP address format
function isValidIp(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // Basic IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Helper function to check if an IP is in trusted proxy list
function isTrustedProxy(ip: string): boolean {
  if (!env.RATE_LIMIT_TRUSTED_PROXIES) return false;
  
  const trustedIps = env.RATE_LIMIT_TRUSTED_PROXIES.split(",").map(ip => ip.trim());
  return trustedIps.includes(ip);
}

// Key generator function to identify clients securely
function keyGenerator(c: Context): string {
  // Get connection info - this is the most reliable source
  const connectionIp = c.env?.incoming?.socket?.remoteAddress;
  
  // If proxy trust is disabled, always use connection IP
  if (!env.RATE_LIMIT_TRUST_PROXY) {
    return connectionIp || "direct-connection";
  }

  // If proxy trust is enabled, validate the proxy chain
  if (connectionIp && isTrustedProxy(connectionIp)) {
    // We're behind a trusted proxy, check proxy headers
    const forwarded = c.req.header("x-forwarded-for");
    const realIp = c.req.header("x-real-ip");
    const cfConnecting = c.req.header("cf-connecting-ip");

    // Extract first IP from x-forwarded-for (original client)
    const forwardedIp = forwarded?.split(",")[0]?.trim();
    
    // Check each header in priority order and validate
    const candidateIps = [forwardedIp, realIp, cfConnecting].filter(Boolean);
    const validIp = candidateIps.find(ip => ip && isValidIp(ip));
    
    if (validIp) {
      return validIp;
    }
  }
  
  // Fallback to connection IP or generate unique identifier
  return connectionIp || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Skip rate limiting function for development
function skip(c: Context): boolean {
  // Skip rate limiting in development mode
  if (env.NODE_ENV === "development") {
    return true;
  }

  // Skip for health check endpoints
  const path = c.req.path;
  if (path === "/" || path === "/health") {
    return true;
  }

  // Skip GraphQL endpoints - they have their own specific rate limiter
  if (path === "/graphql" || path === "/playground") {
    return true;
  }

  return false;
}

// Separate skip function for GraphQL rate limiter
function skipGraphQL(c: Context): boolean {
  // Skip rate limiting in development mode
  if (env.NODE_ENV === "development") {
    return true;
  }
  
  // GraphQL rate limiter should NOT skip GraphQL endpoints
  return false;
}

// Create different rate limiters for different endpoint types
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
