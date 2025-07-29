import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { users } from "@/db/schema";
import { AuthService } from "@/lib/auth";

import type { LoginRoute, MeRoute, RefreshRoute, RegisterRoute } from "./auth.routes";

export const register: AppRouteHandler<RegisterRoute> = async (c) => {
  const { email, password, name, imageUrl } = c.req.valid("json");

  const normalizedEmail = AuthService.normalizeEmail(email);

  const passwordValidation = AuthService.validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
      message: `Password validation failed: ${passwordValidation.errors.join(", ")}`,
    });
  }

  const existingUser = await AuthService.findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new HTTPException(HttpStatusCodes.CONFLICT, {
      message: "Email already exists",
    });
  }

  const hashedPassword = await AuthService.hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      password: hashedPassword,
      name: name || null,
      imageUrl: imageUrl || null,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      imageUrl: users.imageUrl,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  const tokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    imageUrl: newUser.imageUrl,
    isActive: newUser.isActive,
  };
  const accessToken = AuthService.generateAccessToken(tokenPayload);
  const refreshToken = AuthService.generateRefreshToken(tokenPayload);

  await AuthService.updateLastLogin(newUser.id);

  return c.json(
    {
      user: newUser,
      accessToken,
      refreshToken,
    },
    HttpStatusCodes.CREATED,
  );
};

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { email, password } = c.req.valid("json");

  const normalizedEmail = AuthService.normalizeEmail(email);

  const user = await AuthService.findUserByEmail(normalizedEmail);
  if (!user || !user.isActive) {
    return c.json(
      { message: "Invalid credentials" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  const isValid = await AuthService.verifyPassword(password, user.password);
  if (!isValid) {
    return c.json(
      { message: "Invalid credentials" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    isActive: user.isActive,
  };
  const accessToken = AuthService.generateAccessToken(tokenPayload);
  const refreshToken = AuthService.generateRefreshToken(tokenPayload);

  await AuthService.updateLastLogin(user.id);

  const { password: _, ...userWithoutPassword } = user;

  return c.json({
    user: {
      ...userWithoutPassword,
      lastLoginAt: userWithoutPassword.lastLoginAt ? new Date(userWithoutPassword.lastLoginAt) : null,
      createdAt: userWithoutPassword.createdAt ? new Date(userWithoutPassword.createdAt) : null,
      updatedAt: userWithoutPassword.updatedAt ? new Date(userWithoutPassword.updatedAt) : null,
    },
    accessToken,
    refreshToken,
  }, HttpStatusCodes.OK);
};

export const refresh: AppRouteHandler<RefreshRoute> = async (c) => {
  const { refreshToken } = c.req.valid("json");

  try {
    const payload = AuthService.verifyRefreshToken(refreshToken);

    const user = await AuthService.findUserById(payload.userId);
    if (!user || !user.isActive) {
      return c.json(
        { message: "Invalid user" },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      isActive: user.isActive,
    };
    const newAccessToken = AuthService.generateAccessToken(tokenPayload);
    const newRefreshToken = AuthService.generateRefreshToken(tokenPayload);

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, HttpStatusCodes.OK);
  }
  catch {
    return c.json(
      { message: "Invalid refresh token" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }
};

export const me: AppRouteHandler<MeRoute> = async (c) => {
  const user = c.get("user");
  return c.json(user, HttpStatusCodes.OK);
};
