import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import { insertCommentBodySchema, insertCommentsSchema, patchCommentsSchema, selectCommentsSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Comments"];

// GET /posts/{postId}/comments - List comments for a post
export const list = createRoute({
  path: "/posts/{postId}/comments",
  method: "get",
  tags,
  summary: "List comments for a post",
  description: "Get all comments for a specific post with pagination and sorting support",
  request: {
    params: z.object({
      postId: z.uuid(),
    }),
    query: z.object({
      all: z.coerce.boolean().optional().default(false).openapi({ description: "Return all comments without pagination" }),
      page: z.coerce.number().int().min(1).default(1).openapi({ description: "Page number for pagination" }),
      limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ description: "Number of comments per page" }),
      sort: z.enum(["ASC", "DESC"]).optional().default("ASC").openapi({ description: "Sort order by creation date (ASC = oldest first, DESC = newest first)" }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.union([
        z.object({
          data: z.array(selectCommentsSchema),
          meta: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            totalPages: z.number(),
            hasNextPage: z.boolean(),
            hasPreviousPage: z.boolean(),
          }),
        }),
        z.array(selectCommentsSchema),
      ]),
      "List of comments",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
  },
});

// POST /posts/{postId}/comments - Create comment (anonymous or authenticated)
export const create = createRoute({
  path: "/posts/{postId}/comments",
  method: "post",
  tags,
  summary: "Create a comment on a post",
  description: "Create a new comment. Can be anonymous (provide authorName) or authenticated (uses logged-in user info). If authenticated, user info takes precedence over submitted data.",
  request: {
    params: z.object({
      postId: z.string().uuid(),
    }),
    body: jsonContentRequired(
      insertCommentBodySchema,
      "The comment to create",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectCommentsSchema, "The created comment"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Post not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertCommentsSchema),
      "The validation error(s)",
    ),
  },
});

// GET /comments/{id} - Get single comment
export const getOne = createRoute({
  path: "/comments/{id}",
  method: "get",
  tags,
  summary: "Get a specific comment",
  description: "Retrieve a single comment by its ID",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectCommentsSchema, "The requested comment"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Comment not found"),
  },
});

// PATCH /comments/{id} - Update comment (ownership check)
export const patch = createRoute({
  path: "/comments/{id}",
  method: "patch",
  tags,
  summary: "Update a comment",
  description: "Update a comment. Authentication required. Users can only update their own comments. Sets isEdited flag and editedAt timestamp.",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(
      patchCommentsSchema.pick({ content: true }),
      "The comment updates (content only)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectCommentsSchema, "The updated comment"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required to update comments",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only update your own comments",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Comment not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchCommentsSchema),
      "The validation error(s)",
    ),
  },
});

// DELETE /comments/{id} - Delete comment (ownership check)
export const remove = createRoute({
  path: "/comments/{id}",
  method: "delete",
  tags,
  summary: "Delete a comment",
  description: "Delete a comment. Authentication required. Users can only delete their own comments.",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Comment deleted successfully" },
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required to delete comments",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only delete your own comments",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Comment not found"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
