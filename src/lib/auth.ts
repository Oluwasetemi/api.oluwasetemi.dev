import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { sign, verify } from "hono/jwt";

import db from "@/db";
import { account, session, users, verification } from "@/db/schema";
import env from "@/env";

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

  static async generateAccessToken(payload: Omit<JWTPayload, "type">): Promise<string> {
    const tokenPayload = {
      ...payload,
      type: "access" as const,
      exp: Math.floor(Date.now() / 1000) + AuthService.parseExpiration(env.JWT_EXPIRES_IN),
    };
    return sign(tokenPayload, env.JWT_SECRET);
  }

  static async generateRefreshToken(payload: Omit<JWTPayload, "type">): Promise<string> {
    const tokenPayload = {
      ...payload,
      type: "refresh" as const,
      exp: Math.floor(Date.now() / 1000) + AuthService.parseExpiration(env.JWT_REFRESH_EXPIRES_IN),
    };
    return sign(tokenPayload, env.JWT_REFRESH_SECRET);
  }

  // Helper to parse expiration strings like "24h", "7d" to seconds
  private static parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }

  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = await verify(token, env.JWT_SECRET);

      // Validate payload structure
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid token payload");
      }

      const jwtPayload = payload as JWTPayload;

      if (jwtPayload.type !== "access") {
        throw new Error("Invalid token type");
      }

      return jwtPayload;
    }
    catch (error) {
      if (error instanceof Error) {
        throw new Error(`Access token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  static async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
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
      console.log(user, url, token);
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendResetPassword: async ({ user, token, url }) => {
      console.log({ user, token, url });
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
