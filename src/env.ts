/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

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
    JWT_EXPIRES_IN: z.string().default("24h"),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  })
  .superRefine((input, ctx) => {

    // Validate JWT secrets are strong enough for production
    if (input.NODE_ENV === "production") {
      if (input.JWT_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: "string",
          minimum: 64,
          inclusive: true,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET must be at least 64 characters in production",
        });
      }

      if (input.JWT_REFRESH_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: "string",
          minimum: 64,
          inclusive: true,
          path: ["JWT_REFRESH_SECRET"],
          message: "JWT_REFRESH_SECRET must be at least 64 characters in production",
        });
      }

      // Ensure secrets are different
      if (input.JWT_SECRET === input.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_REFRESH_SECRET"],
          message: "JWT_SECRET and JWT_REFRESH_SECRET must be different",
        });
      }
    }
  });

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

// Debug DATABASE_URL in production to help diagnose connection issues
if (env!.NODE_ENV === "production") {
  const dbUrl = env!.DATABASE_URL;
  console.log("🔍 DATABASE_URL validation:");
  console.log(`  Length: ${dbUrl.length}`);
  console.log(`  Starts with: ${dbUrl.substring(0, 20)}...`);
  console.log(`  Protocol: ${dbUrl.split('://')[0]}`);
  
  // Check if it's a valid libsql URL format
  if (!dbUrl.startsWith('libsql://') && !dbUrl.startsWith('file:')) {
    console.warn("⚠️  DATABASE_URL should start with 'libsql://' for Turso or 'file:' for SQLite");
  }
}

export default env!;
