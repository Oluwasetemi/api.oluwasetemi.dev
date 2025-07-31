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
  // Content Security Policy - compatible with Apollo's nonce-based CSP approach
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://embeddable-sandbox.cdn.apollographql.com; script-src-elem 'self' 'unsafe-inline' https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://embeddable-sandbox.cdn.apollographql.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: https://apollo-server-landing-page.cdn.apollographql.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com; frame-src 'self' https://sandbox.embed.apollographql.com https://embeddable-sandbox.netlify.app https://explorer.embed.apollographql.com https://studio.apollographql.com; manifest-src 'self' https://apollo-server-landing-page.cdn.apollographql.com; frame-ancestors 'none';",

  // Cross-Origin headers - relaxed for Apollo resources
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: "same-origin-allow-popups",
  crossOriginResourcePolicy: "cross-origin",

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
  // More lenient CSP for development (allows localhost connections and Apollo CDN)
  contentSecurityPolicy: "default-src 'self' localhost:* 127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net https://unpkg.com https://embeddable-sandbox.cdn.apollographql.com https://sandbox.embed.apollographql.com https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://app.satismeter.com; script-src-elem 'self' 'unsafe-inline' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net https://unpkg.com https://embeddable-sandbox.cdn.apollographql.com https://sandbox.embed.apollographql.com https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com; style-src 'self' 'unsafe-inline' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; img-src 'self' data: https: localhost:* 127.0.0.1:* https://apollo-server-landing-page.cdn.apollographql.com; font-src 'self' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net https://unpkg.com https://fonts.gstatic.com; connect-src 'self' localhost:* 127.0.0.1:* ws: wss: https: https://apollo-server-landing-page.cdn.apollographql.com https://sandbox.embed.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://app.satismeter.com; frame-src 'self' https://sandbox.embed.apollographql.com https://embeddable-sandbox.netlify.app https://explorer.embed.apollographql.com https://studio.apollographql.com; manifest-src 'self' https://apollo-server-landing-page.cdn.apollographql.com; frame-ancestors 'self' https://sandbox.embed.apollographql.com https://embeddable-sandbox.netlify.app https://explorer.embed.apollographql.com;",

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

    const method = c.req.method;
    const path = c.req.path;

    const cacheableEndpoints = [
      "/", // root endpoint
      "/doc", // OpenAPI spec
      "/reference", // API documentation
    ];

    const sensitiveEndpoints = [
      "/analytics",
      "/graphql",
      "/tasks",
    ];

    const isCacheable = method === "GET" && cacheableEndpoints.includes(path);
    const isSensitive = sensitiveEndpoints.some(endpoint => path.startsWith(endpoint));

    if (isCacheable && !isSensitive) {
      c.header("Cache-Control", "private, max-age=300");
    }
    else {
      c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
  };
}

function convertCamelToKebab(str: string): string {
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char >= "A" && char <= "Z" && i > 0) {
      result += `-${char}`;
    }
    else if (i === 0) {
      result += char.toUpperCase();
    }
    else {
      result += char;
    }
  }

  return result.replace(/-([a-z])/g, (match, letter) => `-${letter.toUpperCase()}`);
}

export const strictSecurityHeaders = securityHeaders({
  contentSecurityPolicy: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  crossOriginEmbedderPolicy: "require-corp",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
});

export const apiSecurityHeaders = securityHeaders({
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://embeddable-sandbox.cdn.apollographql.com https://sandbox.embed.apollographql.com https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://app.satismeter.com; script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://embeddable-sandbox.cdn.apollographql.com https://sandbox.embed.apollographql.com https://apollo-server-landing-page.cdn.apollographql.com https://embeddable-explorer.cdn.apollographql.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; img-src 'self' data: https: https://apollo-server-landing-page.cdn.apollographql.com; font-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://fonts.gstatic.com; connect-src 'self' https: https://apollo-server-landing-page.cdn.apollographql.com https://sandbox.embed.apollographql.com https://embeddable-explorer.cdn.apollographql.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://app.satismeter.com; frame-src 'self' https://sandbox.embed.apollographql.com https://embeddable-sandbox.netlify.app https://explorer.embed.apollographql.com https://studio.apollographql.com; manifest-src 'self' https://apollo-server-landing-page.cdn.apollographql.com; frame-ancestors 'self' https://sandbox.embed.apollographql.com https://embeddable-sandbox.netlify.app https://explorer.embed.apollographql.com;",
  xFrameOptions: "SAMEORIGIN",
  xContentTypeOptions: "nosniff",
  crossOriginResourcePolicy: "cross-origin",
  crossOriginEmbedderPolicy: false,
});

export const developmentSecurityHeaders = securityHeaders({
  ...developmentOptions,
});

export default securityHeaders;
