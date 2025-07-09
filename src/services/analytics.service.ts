import { and, eq, gte, lt, lte, sql } from "drizzle-orm";

import db from "@/db";
import { insertRequestsSchema, requests } from "@/db/schema";
import env from "@/env";

// Log a request to the database
export function logRequest(data: any) {
  // Skip logging if analytics is disabled
  if (!env.ENABLE_ANALYTICS) {
    return;
  }

  queueMicrotask(async () => {
    try {
      await db.insert(requests)
        .values(insertRequestsSchema.parse(data))
        .run();
    }
    catch (error) {
      console.error("Failed to log request:", error);
    }
  });
}

// Get aggregated counts (refactored)
export async function getCounts({
  from,
  to,
  path,
  method,
  groupBy,
}: {
  from?: string;
  to?: string;
  path?: string;
  method?: string;
  groupBy?: string;
} = {}): Promise<{
  total: number;
  data: Array<{ key: string; count: number }>;
  groupedBy?: string;
}> {
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
    return {
      total,
      data: [],
    };
  }

  // Group by the specified field
  let groupedData: Array<{ key: string; count: number }> = [];

  switch (groupBy) {
    case "day": {
      const dayResults: { date: string | null; count: number }[] = await db
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
        key: r.date ?? "(unknown)",
        count: r.count,
      }));
      break;
    }
    case "path": {
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
    case "method": {
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
    default: {
      return {
        total,
        data: [],
        groupedBy: groupBy,
      };
    }
  }

  return {
    total,
    data: groupedData,
    groupedBy: groupBy,
  };
}

// Prune old entries
export function pruneOld(days: number) {
  queueMicrotask(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      await db.delete(requests)
        .where(lt(requests.createdAt, cutoffDate))
        .run();
    }
    catch (error) {
      console.error("Failed to prune old requests:", error);
    }
  });
}
