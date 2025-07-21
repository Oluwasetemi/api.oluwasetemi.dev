import type { Context, Next } from "hono";

import env from "@/env";

type SecurityHeadersOptions = {
  contentSecurityPolicy?: string | false;
  crossOriginEmbedderPolicy?: string | false;
  crossOriginOpenerPolicy?: string | false;
  crossOriginResourcePolicy?: string | false;
  originAgentCluster?: string | false;
  referrerPolicy?: string | false;
  strictTransportSecurity?: string | false;
  xContentTypeOptions?: string | false;
  xDnsPrefetchControl?: string | false;
  xDownloadOptions?: string | false;
  xFrameOptions?: string | false;
  xPermittedCrossDomainPolicies?: string | false;
  xXssProtection?: string | false;
};

const defaultOptions: SecurityHeadersOptions = {
  // Content Security Policy - restrictive by default
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",

  // Cross-Origin headers
  crossOriginEmbedderPolicy: "require-corp",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",

  // Other security headers
  originAgentCluster: "?1",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
  xContentTypeOptions: "nosniff",
  xDnsPrefetchControl: "off",
  xDownloadOptions: "noopen",
  xFrameOptions: "DENY",
  xPermittedCrossDomainPolicies: "none",
  xXssProtection: "1; mode=block",
};

// Development-friendly options (less restrictive)
const developmentOptions: SecurityHeadersOptions = {
  ...defaultOptions,
  // More lenient CSP for development (allows localhost connections)
  contentSecurityPolicy: "default-src 'self' localhost:* 127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*; style-src 'self' 'unsafe-inline' localhost:* 127.0.0.1:*; img-src 'self' data: https: localhost:* 127.0.0.1:*; font-src 'self' localhost:* 127.0.0.1:*; connect-src 'self' localhost:* 127.0.0.1:* ws: wss:; frame-ancestors 'none';",

  // Disable HSTS in development (no HTTPS requirement)
  strictTransportSecurity: false,

  // Less restrictive cross-origin policies for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
};

export function securityHeaders(options: SecurityHeadersOptions = {}): (c: Context, next: Next) => Promise<void> {
  // Use development options in development mode
  const baseOptions = env.NODE_ENV === "development" ? developmentOptions : defaultOptions;
  const finalOptions = { ...baseOptions, ...options };

  return async (c: Context, next: Next) => {
    await next();

    // Set each security header if not disabled
    Object.entries(finalOptions).forEach(([key, value]) => {
      if (value !== false && value !== undefined) {
        const headerName = convertCamelToKebab(key);
        c.header(headerName, value);
      }
    });

    // Add some API-specific headers
    c.header("X-API-Version", "1.0");
    c.header("X-Powered-By", "Hono");

    // Cache control for API responses - secure by default
    const method = c.req.method;
    const path = c.req.path;
    
    // Define explicitly cacheable endpoints (allowlist approach)
    const cacheableEndpoints = [
      "/", // root endpoint
      "/doc", // OpenAPI spec
      "/reference", // API documentation
    ];
    
    // Define sensitive endpoints that should never be cached
    const sensitiveEndpoints = [
      "/analytics",
      "/graphql", 
      "/tasks", // May contain user-specific data
    ];
    
    // Check if path exactly matches cacheable endpoints or is sensitive
    const isCacheable = method === "GET" && cacheableEndpoints.includes(path);
    const isSensitive = sensitiveEndpoints.some(endpoint => path.startsWith(endpoint));
    
    if (isCacheable && !isSensitive) {
      // Cache only safe, public endpoints with private cache
      c.header("Cache-Control", "private, max-age=300");
    }
    else {
      // No cache for everything else (secure default)
      c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
  };
}

// Utility function to convert camelCase to kebab-case for header names
function convertCamelToKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/^x/, "X")
    .replace(/-([a-z])/g, (match, letter) => `-${letter.toUpperCase()}`);
}

// Pre-configured middleware for different use cases
export const strictSecurityHeaders = securityHeaders({
  // Maximum security configuration
  contentSecurityPolicy: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  crossOriginEmbedderPolicy: "require-corp",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
});

export const apiSecurityHeaders = securityHeaders({
  // API-optimized security headers
  contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none';",
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
});

export const developmentSecurityHeaders = securityHeaders({
  // Development-friendly headers
  ...developmentOptions,
});

// Export default as the standard security headers
export default securityHeaders;
