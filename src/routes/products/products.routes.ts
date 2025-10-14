import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import { insertProductsSchema, patchProductsSchema, selectProductsSchema } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Products"];

export const list = createRoute({
  path: "/products",
  method: "get",
  tags,
  request: {
    query: z.object({
      all: z.coerce.boolean().optional().default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      category: z.string().optional(),
      featured: z.coerce.boolean().optional(),
      published: z.coerce.boolean().optional(),
      search: z.string().optional(),
      sort: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectProductsSchema),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      }).or(z.array(selectProductsSchema)),
      "List of products",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const create = createRoute({
  path: "/products",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertProductsSchema, "The product to create"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProductsSchema, "The created product"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertProductsSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/products/{id}",
  method: "get",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProductsSchema, "The requested product"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Product not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id error",
    ),
  },
});

export const patch = createRoute({
  path: "/products/{id}",
  method: "patch",
  tags,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchProductsSchema, "The product updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProductsSchema, "The updated product"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only update your own products",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Product not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchProductsSchema).or(createErrorSchema(IdUUIDParamsSchema)),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/products/{id}",
  method: "delete",
  tags,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Product deleted" },
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      notFoundSchema,
      "Authentication required",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      notFoundSchema,
      "Forbidden - You can only delete your own products",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Product not found"),
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
