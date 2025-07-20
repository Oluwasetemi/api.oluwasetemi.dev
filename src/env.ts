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
    DATABASE_URL: z.string().url(),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    ENABLE_ANALYTICS: z.coerce.boolean().default(false),
    ANALYTICS_RETENTION_DAYS: z.coerce.number().default(30),
    // Rate limiting configuration
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100), // requests per window
    RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z.coerce.boolean().default(false),
    RATE_LIMIT_SKIP_FAILED_REQUESTS: z.coerce.boolean().default(false),
  })
  .superRefine((input, ctx) => {
    if (input.NODE_ENV === "production" && !input.DATABASE_AUTH_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["DATABASE_AUTH_TOKEN"],
        message: "Must be set when NODE_ENV is 'production'",
      });
    }
  });

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;
