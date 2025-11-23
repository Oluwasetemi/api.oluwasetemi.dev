import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { users } from "@/db/schema";
import { AuthService } from "@/lib/auth";

import type { LoginRoute, MeRoute, RefreshRoute, RegisterRoute } from "./auth.routes";

export const register: AppRouteHandler<RegisterRoute> = async (c) => {
  const { email, password, name, image } = c.req.valid("json");

  const normalizedEmail = AuthService.normalizeEmail(email);

  const passwordValidation = AuthService.validatePassword(password || "");
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

  const hashedPassword = await AuthService.hashPassword(password || "");

  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      password: hashedPassword,
      name,
      image: image || null,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      emailVerified: users.emailVerified,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  const tokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    image: newUser.image,
    isActive: newUser.isActive,
  };
  const accessToken = await AuthService.generateAccessToken(tokenPayload);
  const refreshToken = await AuthService.generateRefreshToken(tokenPayload);

  await AuthService.updateLastLogin(newUser.id);

  return c.json(
    {
      user: {
        ...newUser,
        imageUrl: newUser.image, // Map image to imageUrl for API consistency
      },
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

  const isValid = await AuthService.verifyPassword(password, user.password || "");
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
    image: user.image,
    isActive: user.isActive,
  };
  const accessToken = await AuthService.generateAccessToken(tokenPayload);
  const refreshToken = await AuthService.generateRefreshToken(tokenPayload);

  await AuthService.updateLastLogin(user.id);

  const { password: _, ...userWithoutPassword } = user;

  return c.json({
    user: {
      ...userWithoutPassword,
      imageUrl: userWithoutPassword.image, // Map image to imageUrl for API consistency
    },
    accessToken,
    refreshToken,
  }, HttpStatusCodes.OK);
};

export const refresh: AppRouteHandler<RefreshRoute> = async (c) => {
  const { refreshToken } = c.req.valid("json");

  try {
    const payload = await AuthService.verifyRefreshToken(refreshToken);

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
      image: user.image,
      isActive: user.isActive,
    };
    const newAccessToken = await AuthService.generateAccessToken(tokenPayload);
    const newRefreshToken = await AuthService.generateRefreshToken(tokenPayload);

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
  return c.json({
    ...user,
    imageUrl: user.image, // Map image to imageUrl for API consistency
  }, HttpStatusCodes.OK);
};
