import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import { insertPostsSchema, patchPostsSchema, selectPostsSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Posts"];

export const list = createRoute({
  path: "/posts",
  method: "get",
  tags,
  request: {
    query: z.object({
      all: z.coerce.boolean().optional().default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      category: z.string().optional(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      search: z.string().optional(),
      sort: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectPostsSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectPostsSchema)),
      "List of posts",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const create = createRoute({
  path: "/posts",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertPostsSchema, "The post to create"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPostsSchema, "The created post"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertPostsSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/posts/{id}",
  method: "get",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPostsSchema, "The requested post"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const getBySlug = createRoute({
  path: "/posts/slug/{slug}",
  method: "get",
  tags,
  request: {
    params: z.object({
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Invalid slug format" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPostsSchema, "The requested post"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ slug: z.string() })),
      "Invalid slug error",
    ),
  },
});

export const patch = createRoute({
  path: "/posts/{id}",
  method: "patch",
  tags,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchPostsSchema, "The post updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPostsSchema, "The updated post"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only update your own posts",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchPostsSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/posts/{id}",
  method: "delete",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Post deleted" },
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only delete your own posts",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type GetBySlugRoute = typeof getBySlug;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
