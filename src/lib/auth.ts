import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";

// Simple in-memory cache for JWT tokens (for performance optimization)
const tokenCache = new Map<string, { payload: JWTPayload; exp: number }>();

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
  name: string | null;
  imageUrl: string | null;
  isActive: boolean;
  type: "access" | "refresh";
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
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

  static generateAccessToken(payload: Omit<JWTPayload, "type">): string {
    const tokenPayload = { ...payload, type: "access" as const };
    // Note: Using type assertion due to jsonwebtoken library typing issues
    return (jwt.sign as any)(
      tokenPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }

  static generateRefreshToken(payload: Omit<JWTPayload, "type">): string {
    const tokenPayload = { ...payload, type: "refresh" as const };
    // Note: Using type assertion due to jsonwebtoken library typing issues
    return (jwt.sign as any)(
      tokenPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    );
  }

  static verifyAccessToken(token: string): JWTPayload {
    // Check cache first for performance
    const cached = tokenCache.get(token);
    if (cached && cached.exp > Date.now() / 1000) {
      return cached.payload;
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    if (payload.type !== "access") {
      throw new Error("Invalid token type");
    }

    // Cache the verified token for better performance
    // Only cache in development/staging for memory management
    if (env.NODE_ENV !== "production") {
      const decoded = jwt.decode(token, { json: true });
      if (decoded?.exp) {
        tokenCache.set(token, { payload, exp: decoded.exp });

        // Clean up cache periodically (keep only last 100 tokens)
        if (tokenCache.size > 100) {
          const entries = Array.from(tokenCache.entries());
          const oldest = entries.slice(0, 50);
          oldest.forEach(([key]) => tokenCache.delete(key));
        }
      }
    }

    return payload;
  }

  static verifyRefreshToken(token: string): JWTPayload {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
    if (payload.type !== "refresh") {
      throw new Error("Invalid token type");
    }
    return payload;
  }

  static async findUserById(id: string): Promise<AuthUser | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
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

  static async findUserByEmail(email: string): Promise<(AuthUser & { password: string }) | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
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
  const matches = authHeader.match(/^Bearer\s(.+)$/);
  return matches ? matches[1] : null;
}
