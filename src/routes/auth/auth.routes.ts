import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { insertUsersSchema, selectUsersSchema } from "@/db/schema";

// Create a user schema without password for responses
const userResponseSchema = selectUsersSchema.omit({ password: true });

const tags = ["Auth"];

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const RegisterSchema = insertUsersSchema;

const AuthResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

const RefreshSchema = z.object({
  refreshToken: z.string(),
});

const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const register = createRoute({
  path: "/auth/register",
  method: "post",
  tags,
  description: "Register a new user",
  summary: "Register a new user",
  request: {
    body: jsonContentRequired(RegisterSchema, "User registration data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(AuthResponseSchema, "User registered successfully"),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema("Email already exists"), "Email already exists"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema("Validation error"), "Validation error"),
  },
});

export const login = createRoute({
  path: "/auth/login",
  method: "post",
  tags,
  description: "Login a user",
  summary: "Login user",
  request: {
    body: jsonContentRequired(LoginSchema, "User login credentials"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(AuthResponseSchema, "User logged in successfully"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema("Invalid credentials"), "Invalid credentials"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema("Validation error"), "Validation error"),
  },
});

export const refresh = createRoute({
  path: "/auth/refresh",
  method: "post",
  tags,
  description: "Refresh access token",
  summary: "Refresh access token",
  request: {
    body: jsonContentRequired(RefreshSchema, "Refresh token"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RefreshResponseSchema, "Token refreshed successfully"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema("Invalid refresh token"), "Invalid refresh token"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema("Validation error"), "Validation error"),
  },
});

export const me = createRoute({
  path: "/auth/me",
  method: "get",
  tags,
  description: "Get current user profile",
  summary: "Get current user profile",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(userResponseSchema, "Current user profile"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema("Authentication required"), "Authentication required"),
  },
});

export type RegisterRoute = typeof register;
export type LoginRoute = typeof login;
export type RefreshRoute = typeof refresh;
export type MeRoute = typeof me;
