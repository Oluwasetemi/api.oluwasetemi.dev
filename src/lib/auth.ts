import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { sign, verify } from "hono/jwt";

import db from "@/db";
import { account, session, users, verification } from "@/db/schema";
import env from "@/env";
import { logger } from "@/middlewares/pino-logger";

import { sendEmail } from "./email";

// Pre-compiled regex patterns for password validation (performance optimization)
const passwordRegexes = {
  lowercase: /(?=.*[a-z])/,
  uppercase: /(?=.*[A-Z])/,
  digit: /(?=.*\d)/,
  special: /(?=.*[@$!%*?&])/,
};

export type JWTPayload = {
  userId: string;
  email: string;
  name: string;
  image: string | null;
  isActive: boolean;
  type: "access" | "refresh";
  exp: number; // Unix timestamp (seconds since epoch)
};

export type AuthUser = {
  id: string;
  email: string;
  password?: string | null;
  name: string; // Required, not nullable
  image: string | null;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export class AuthService {
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Fast length checks first
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (password.length > 128) {
      errors.push("Password must be less than 128 characters");
    }

    // Use pre-compiled regex patterns for better performance
    if (!passwordRegexes.lowercase.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!passwordRegexes.uppercase.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!passwordRegexes.digit.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!passwordRegexes.special.test(password)) {
      errors.push("Password must contain at least one special character (@$!%*?&)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static async hashPassword(password: string): Promise<string> {
    // Optimize bcrypt rounds for development speed vs production security
    const rounds = env.NODE_ENV === "production" ? 12 : 8;
    return bcrypt.hash(password, rounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async generateAccessToken(payload: Omit<JWTPayload, "type" | "exp">): Promise<string> {
    const tokenPayload = {
      ...payload,
      type: "access" as const,
      exp: Math.floor(Date.now() / 1000) + AuthService.parseExpiration(env.JWT_EXPIRES_IN),
    };
    return await sign(tokenPayload, env.JWT_SECRET);
  }

  static async generateRefreshToken(payload: Omit<JWTPayload, "type" | "exp">): Promise<string> {
    const tokenPayload = {
      ...payload,
      type: "refresh" as const,
      exp: Math.floor(Date.now() / 1000) + AuthService.parseExpiration(env.JWT_REFRESH_EXPIRES_IN),
    };
    return await sign(tokenPayload, env.JWT_REFRESH_SECRET);
  }

  // Helper to parse expiration strings like "24h", "7d" to seconds
  private static parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    if (value <= 0) {
      throw new Error(`Expiration value must be positive: ${expiration}`);
    }

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const seconds = value * multipliers[unit];
    const MAX_EXPIRATION = 365 * 86400; // 1 year in seconds

    if (seconds > MAX_EXPIRATION) {
      throw new Error(`Expiration too large (max 1 year): ${expiration}`);
    }
    return seconds;
  }

  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      // First try to verify with access token secret
      const payload = await verify(token, env.JWT_SECRET);

      // Validate payload structure
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid token payload");
      }

      // Explicit field-level validation before casting
      if (typeof payload.userId !== "string" || payload.userId.trim() === "") {
        throw new Error("Invalid token payload: missing or invalid userId");
      }
      if (typeof payload.email !== "string" || payload.email.trim() === "") {
        throw new Error("Invalid token payload: missing or invalid email");
      }
      if (typeof payload.name !== "string" || payload.name.trim() === "") {
        throw new Error("Invalid token payload: missing or invalid name");
      }
      if (typeof payload.isActive !== "boolean") {
        throw new TypeError("Invalid token payload: missing or invalid isActive");
      }
      if (payload.type !== "access") {
        throw new Error("Invalid token payload: missing or invalid type");
      }

      return payload as JWTPayload;
    }
    catch (error) {
      if (error instanceof Error) {
        // If it's already a validation error, rethrow it
        if (error.message.startsWith("Invalid token payload:")) {
          throw new Error(`Access token verification failed: ${error.message}`);
        }

        // Check if it's a signature mismatch - might be a refresh token
        if (error.message.includes("signature")) {
          try {
            const payload = await verify(token, env.JWT_REFRESH_SECRET);
            if (payload && typeof payload === "object" && (payload as JWTPayload).type === "refresh") {
              throw new Error("Invalid token type");
            }
          }
          catch (verifyError) {
            // If verification with refresh secret succeeds and shows it's a refresh token, throw Invalid token type
            if (verifyError instanceof Error && verifyError.message === "Invalid token type") {
              throw verifyError;
            }
            // Otherwise, fall through to throw the original error
          }
        }
        throw new Error(`Access token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  static async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      // First try to verify with refresh token secret
      const payload = await verify(token, env.JWT_REFRESH_SECRET);

      // Validate payload structure
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid token payload");
      }

      const jwtPayload = payload as JWTPayload;

      if (jwtPayload.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      return jwtPayload;
    }
    catch (error) {
      if (error instanceof Error) {
        // If it's already an "Invalid token type" error, rethrow it
        if (error.message === "Invalid token type") {
          throw error;
        }

        // Check if it's a signature mismatch - might be an access token
        if (error.message.includes("signature")) {
          try {
            const payload = await verify(token, env.JWT_SECRET);
            if (payload && typeof payload === "object" && (payload as JWTPayload).type === "access") {
              throw new Error("Invalid token type");
            }
          }
          catch (verifyError) {
            // If verification with access secret succeeds and shows it's an access token, throw Invalid token type
            if (verifyError instanceof Error && verifyError.message === "Invalid token type") {
              throw verifyError;
            }
            // Otherwise, fall through to throw the original error
          }
        }
        throw new Error(`Refresh token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  static async findUserById(id: string): Promise<AuthUser | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  static async findUserByEmail(email: string): Promise<AuthUser | null> {
    const normalizedEmail = AuthService.normalizeEmail(email);
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return user || null;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader)
    return null;

  const trimmed = authHeader.trim();
  if (!trimmed.startsWith("Bearer")) {
    return null;
  }

  // Remove "Bearer" and any following whitespace
  const afterBearer = trimmed.slice(6).trim();
  return afterBearer || null;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      account,
      session,
      user: users,
      verification,
    },
  }),
  changeEmail: {
    enabled: true,
    autoVerify: true,
  },
  emailAndPassword: {
    enabled: true,
    hashPassword: async (password: string) => {
      return AuthService.hashPassword(password);
    },
    verifyPassword: async (password: string, hashedPassword: string) => {
      return AuthService.verifyPassword(password, hashedPassword);
    },
    sendVerificationEmail: async ({ user, url, token }: { user: { email: string }; url: string; token: string }) => {
      logger.debug({ user, url, token }, "Sending verification email");
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendResetPassword: async ({ user, token, url }) => {
      logger.debug({ user, token, url }, "Sending reset password email");
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url} ${token}`,
      });
    },
  },
  plugins: [
    openAPI({
      path: "/docs",
      reference: "/reference",
    }),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
  },
});
