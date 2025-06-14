import type { z } from "zod";

import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createErrorSchema } from "stoker/openapi/schemas";
import IdUUIDParamsSchema from "stoker/openapi/schemas/id-uuid-params";

import type { selectTasksSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { tasks } from "@/db/schema";
import { notFoundSchema, ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";

import type {
  CreateRoute,
  GetOneRoute,
  ListChildrenRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
} from "./tasks.routes";

type Task = z.infer<typeof selectTasksSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { all, page, limit, status, priority, search, sort = "DESC" } = c.req.valid("query");

  // Build where conditions
  const whereConditions = [];
  if (status)
    whereConditions.push(eq(tasks.status, status));
  if (priority)
    whereConditions.push(eq(tasks.priority, priority));
  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(
      sql`(${tasks.name} LIKE ${searchPattern} OR ${tasks.description} LIKE ${searchPattern})`,
    );
  }

  const orderBy = sort === "ASC" ? [asc(tasks.createdAt)] : [desc(tasks.createdAt)];

  if (all) {
    const tasksList = await db.query.tasks.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit: 200,
      orderBy,
    });
    return c.json(tasksList as Task[], HttpStatusCodes.OK);
  }
  else {
    const offset = (page - 1) * limit;

    const [tasksList, totalResult] = await Promise.all([
      db.query.tasks.findMany({
        where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
        limit,
        offset,
        orderBy,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined)
        .get(),
    ]);

    if (!totalResult) {
      return c.json({
        data: [] as Task[],
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
      data: tasksList as Task[],
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }, HttpStatusCodes.OK);
  }
};

// TODO: list all the children of a task
export const listChildren: AppRouteHandler<ListChildrenRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const { page, limit, all } = c.req.valid("query");

  if (all) {
    const tasksList = await db.query.tasks.findMany({
      where(fields, operators) {
        return operators.eq(fields.parentId, id);
      },
    });

    return c.json(tasksList as Task[], HttpStatusCodes.OK);
  }

  const offset = (page - 1) * limit;

  const [tasksList, totalResult] = await Promise.all([
    db.query.tasks.findMany({
      where(fields, operators) {
        return operators.eq(fields.parentId, id);
      },
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.parentId, id)).get(),
  ]);

  if (!totalResult) {
    return c.json({
      data: [] as Task[],
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
    data: tasksList as Task[],
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

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const task = c.req.valid("json");
  const inserted = await db.insert(tasks).values(task).returning().get();
  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const result = IdUUIDParamsSchema.safeParse(c.req.param());
  if (!result.success) {
    return c.json(
      createErrorSchema(IdUUIDParamsSchema).parse({
        success: false,
        error: result.error,
      }),
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const { id } = result.data;
  const task = await db.query.tasks.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!task) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(task as Task, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: ZOD_ERROR_CODES.INVALID_UPDATES,
              path: [],
              message: ZOD_ERROR_MESSAGES.NO_UPDATES,
            },
          ],
          name: "ZodError",
        },
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const task = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning()
    .get();

  if (!task) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(task, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const task = await db.query.tasks.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (task && task.isDefault) {
    return c.json({ success: true, message: "Default task removed successfully" }, HttpStatusCodes.OK);
  }

  const result = await db.delete(tasks).where(eq(tasks.id, id));

  if (result.rowsAffected === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
