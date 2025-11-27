/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod/v4";

expand(
  config({
    path: path.resolve(
      process.cwd(),
      process.env.NODE_ENV === "test" ? ".env.test" : ".env",
    ),
  }),
);

const EnvSchema = z
  .object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().default(4444),
    LOG_LEVEL: z.enum([
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ]),
    DATABASE_URL: z.string().min(1),
    ENABLE_ANALYTICS: z.coerce.boolean().default(false),
    ANALYTICS_RETENTION_DAYS: z.coerce.number().default(30),
    // Rate limiting configuration
    RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100), // requests per window
    RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z.coerce.boolean().default(false),
    RATE_LIMIT_SKIP_FAILED_REQUESTS: z.coerce.boolean().default(false),
    // Security: Control whether to trust proxy headers for IP detection
    RATE_LIMIT_TRUST_PROXY: z.coerce.boolean().default(false),
    // Comma-separated list of trusted proxy IPs (when TRUST_PROXY is true)
    RATE_LIMIT_TRUSTED_PROXIES: z.string().default(""),
    // Authentication JWT configuration
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().regex(/^\d+[dhms]$/, "Must be in format: <number><unit> (e.g., 24h, 7d)").default("24h"),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[dhms]$/, "Must be in format: <number><unit> (e.g., 24h, 7d)").default("7d"),
    // Better Auth configuration
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    // BETTER_AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
    // BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
    // BETTER_AUTH_GOOGLE_REDIRECT_URI: z.string().url(),
    // BETTER_AUTH_GOOGLE_POST_LOGOUT_REDIRECT_URI: z.string().url(),
    // BETTER_AUTH_GITHUB_CLIENT_ID: z.string().min(1),
    // BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().min(1),
    // BETTER_AUTH_GITHUB_REDIRECT_URI: z.string().url(),
    // BETTER_AUTH_GITHUB_POST_LOGOUT_REDIRECT_URI: z.string().url(),
    // BETTER_AUTH_GITHUB_SCOPES: z.string().default(""),
    // BETTER_AUTH_GITHUB_AUTHORIZATION_URL: z.string().url(),
    // BETTER_AUTH_GITHUB_TOKEN_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
  })
  .refine(
    (input) => {
      if (input.NODE_ENV !== "production")
        return true;
      return input.JWT_SECRET.length >= 64;
    },
    {
      message: "JWT_SECRET must be at least 64 characters in production",
      path: ["JWT_SECRET"],
    },
  )
  .refine(
    (input) => {
      if (input.NODE_ENV !== "production")
        return true;
      return input.JWT_REFRESH_SECRET.length >= 64;
    },
    {
      message: "JWT_REFRESH_SECRET must be at least 64 characters in production",
      path: ["JWT_REFRESH_SECRET"],
    },
  )
  .refine(
    (input) => {
      if (input.NODE_ENV !== "production")
        return true;
      return input.JWT_SECRET !== input.JWT_REFRESH_SECRET;
    },
    {
      message: "JWT_SECRET and JWT_REFRESH_SECRET must be different",
      path: ["JWT_REFRESH_SECRET"],
    },
  );

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(z.treeifyError(error), null, 2));
  process.exit(1);
}

export default env!;
