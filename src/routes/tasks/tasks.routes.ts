import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import { insertTasksSchema, patchTasksSchema, PriorityEnum, selectTasksSchema, StatusEnum } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Tasks"];

export const list = createRoute({
  path: "/tasks",
  method: "get",
  tags,
  request: {
    query: z.object({
      all: z.coerce.boolean().optional().default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      status: StatusEnum.optional(),
      priority: PriorityEnum.optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectTasksSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectTasksSchema)),
      "List of tasks",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const listChildren = createRoute({
  path: "/tasks/{id}/children",
  method: "get",
  tags,
  request: {
    params: IdUUIDParamsSchema,
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      all: z.coerce.boolean().optional().default(false),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectTasksSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectTasksSchema)),
      "List of children tasks",
    ),
  },
});

export const create = createRoute({
  path: "/tasks",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertTasksSchema, "The task to create"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The created task"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertTasksSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/tasks/{id}",
  method: "get",
  tags,
  request: {
    // This is not working as expected, it should be a string
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The requested task"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const patch = createRoute({
  path: "/tasks/{id}",
  method: "patch",
  tags,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchTasksSchema, "The task updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The updated task"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchTasksSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/tasks/{id}",
  method: "delete",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Task deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
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
export type ListChildrenRoute = typeof listChildren;
