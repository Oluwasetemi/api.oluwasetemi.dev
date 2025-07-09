import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { selectRequestsSchema } from "@/db/schema";

const tags = ["Analytics"];

// Schema for raw requests endpoint
const requestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  method: z.string().optional(),
  path: z.string().optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Schema for counts endpoint
const countsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  groupBy: z.enum(["day", "path", "method"]).optional(),
});

// Response schemas
const requestsResponseSchema = z.object({
  data: z.array(selectRequestsSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

const countsResponseSchema = z.object({
  total: z.number(),
  data: z.array(z.object({
    key: z.string(),
    count: z.number(),
  })).optional(),
  groupedBy: z.enum(["day", "path", "method"]).optional(),
});

// GET /analytics/requests - returns raw rows (paged)
export const getRequests = createRoute({
  path: "/analytics/requests",
  method: "get",
  tags,
  request: {
    query: requestsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      requestsResponseSchema,
      "Paginated list of request analytics",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(requestsQuerySchema),
      "Invalid query parameters",
    ),
  },
});

// GET /analytics/counts - returns aggregated counts
export const getCounts = createRoute({
  path: "/analytics/counts",
  method: "get",
  tags,
  request: {
    query: countsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      countsResponseSchema,
      "Aggregated request counts",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(countsQuerySchema),
      "Invalid query parameters",
    ),
  },
});

export type GetRequestsRoute = typeof getRequests;
export type GetCountsRoute = typeof getCounts;
