import type { z } from "zod/v4";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { selectRequestsSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { requests } from "@/db/schema";

import type { GetCountsRoute, GetRequestsRoute } from "./analytics.routes";

type Request = z.infer<typeof selectRequestsSchema>;

export const getRequests: AppRouteHandler<GetRequestsRoute> = async (c) => {
  const { page, limit, method, path, status, from, to } = c.req.valid("query");

  // Build where conditions
  const whereConditions = [];

  if (method) {
    whereConditions.push(eq(requests.method, method));
  }

  if (path) {
    whereConditions.push(eq(requests.path, path));
  }

  if (status) {
    whereConditions.push(eq(requests.status, status));
  }

  if (from) {
    whereConditions.push(gte(requests.createdAt, new Date(from)));
  }

  if (to) {
    whereConditions.push(lte(requests.createdAt, new Date(to)));
  }

  const whereClause = whereConditions.length > 0
    ? and(...whereConditions)
    : undefined;

  const offset = (page - 1) * limit;

  const [requestsList, totalResult] = await Promise.all([
    db.query.requests.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (requests, { desc }) => [desc(requests.createdAt)],
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(whereClause)
      .get(),
  ]);

  if (!totalResult) {
    return c.json({
      data: [] as Request[],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }, HttpStatusCodes.OK);
  }

  const totalCount = totalResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  return c.json({
    data: requestsList as Request[],
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }, HttpStatusCodes.OK);
};

export const getCounts: AppRouteHandler<GetCountsRoute> = async (c) => {
  const { from, to, path, method, groupBy } = c.req.valid("query");

  // Build where conditions
  const whereConditions = [];

  if (method) {
    whereConditions.push(eq(requests.method, method));
  }

  if (path) {
    whereConditions.push(eq(requests.path, path));
  }

  if (from) {
    whereConditions.push(gte(requests.createdAt, new Date(from)));
  }

  if (to) {
    whereConditions.push(lte(requests.createdAt, new Date(to)));
  }

  const whereClause = whereConditions.length > 0
    ? and(...whereConditions)
    : undefined;

  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(requests)
    .where(whereClause)
    .get();

  const total = totalResult?.count || 0;

  // If no groupBy is specified, return just the total
  if (!groupBy) {
    return c.json({
      total,
    }, HttpStatusCodes.OK);
  }

  // Group by the specified field
  let groupedData: Array<{ key: string; count: number }> = [];

  switch (groupBy) {
    case "day":
    {
      const dayResults: { date: string; count: number }[] = await db
        .select({
          date: sql<string>`DATE(${requests.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(requests)
        .where(whereClause)
        .groupBy(sql`DATE(${requests.createdAt})`)
        .orderBy(sql`DATE(${requests.createdAt})`)
        .all();

      groupedData = dayResults.map(r => ({
        key: r.date,
        count: r.count,
      }));
      break;
    }

    case "path":
    {
      const pathResults: { path: string; count: number }[] = await db
        .select({
          path: requests.path,
          count: sql<number>`count(*)`,
        })
        .from(requests)
        .where(whereClause)
        .groupBy(requests.path)
        .orderBy(sql`count(*) DESC`)
        .all();

      groupedData = pathResults.map(r => ({
        key: r.path,
        count: r.count,
      }));
      break;
    }

    case "method":
    {
      const methodResults: { method: string; count: number }[] = await db
        .select({
          method: requests.method,
          count: sql<number>`count(*)`,
        })
        .from(requests)
        .where(whereClause)
        .groupBy(requests.method)
        .orderBy(sql`count(*) DESC`)
        .all();

      groupedData = methodResults.map(r => ({
        key: r.method,
        count: r.count,
      }));
      break;
    }

    default:
    {
      return c.json({
        total,
        data: [],
        groupedBy: groupBy,
      }, HttpStatusCodes.OK);
    }
  }

  return c.json({
    total,
    data: groupedData,
    groupedBy: groupBy,
  }, HttpStatusCodes.OK);
};
