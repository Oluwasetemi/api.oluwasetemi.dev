import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import {
  insertWebhookSubscriptionsSchema,
  patchWebhookSubscriptionsSchema,
  selectWebhookEventsSchema,
  selectWebhookSubscriptionsSchema,
} from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Webhooks"];

// List webhook subscriptions
export const list = createRoute({
  path: "/webhooks/subscriptions",
  method: "get",
  tags,
  request: {
    query: z.object({
      all: z.coerce.boolean().optional().default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      active: z.coerce.boolean().optional(),
      sort: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectWebhookSubscriptionsSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectWebhookSubscriptionsSchema)),
      "List of webhook subscriptions",
    ),
  },
});

// Create webhook subscription
export const create = createRoute({
  path: "/webhooks/subscriptions",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertWebhookSubscriptionsSchema, "The webhook subscription to create"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectWebhookSubscriptionsSchema, "The created webhook subscription"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertWebhookSubscriptionsSchema),
      "The validation error(s)",
    ),
  },
});

// Get one webhook subscription
export const getOne = createRoute({
  path: "/webhooks/subscriptions/{id}",
  method: "get",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectWebhookSubscriptionsSchema, "The requested webhook subscription"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only view your own webhook subscriptions",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Webhook subscription not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

// Update webhook subscription
export const patch = createRoute({
  path: "/webhooks/subscriptions/{id}",
  method: "patch",
  tags,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchWebhookSubscriptionsSchema, "The webhook subscription updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectWebhookSubscriptionsSchema, "The updated webhook subscription"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only update your own webhook subscriptions",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Webhook subscription not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchWebhookSubscriptionsSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "The validation error(s)",
    ),
  },
});

// Delete webhook subscription
export const remove = createRoute({
  path: "/webhooks/subscriptions/{id}",
  method: "delete",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Webhook subscription deleted" },
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only delete your own webhook subscriptions",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Webhook subscription not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

// Test webhook subscription
export const test = createRoute({
  path: "/webhooks/subscriptions/{id}/test",
  method: "post",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        statusCode: z.number().optional(),
        responseTime: z.number().optional(),
      }),
      "Test result",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Webhook subscription not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

// List webhook events (delivery history)
export const listEvents = createRoute({
  path: "/webhooks/events",
  method: "get",
  tags,
  request: {
    query: z.object({
      all: z.coerce.boolean().optional().default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      subscriptionId: z.string().uuid().optional(),
      status: z.enum(["pending", "delivered", "failed"]).optional(),
      sort: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectWebhookEventsSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectWebhookEventsSchema)),
      "List of webhook events",
    ),
  },
});

// Retry webhook event
export const retryEvent = createRoute({
  path: "/webhooks/events/{id}/retry",
  method: "post",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Retry initiated",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Webhook event not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type TestRoute = typeof test;
export type ListEventsRoute = typeof listEvents;
export type RetryEventRoute = typeof retryEvent;
