import type { z } from "zod/v4";

import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { selectTasksSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { tasks } from "@/db/schema";
import { notFoundSchema, ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";

import type { CreateRoute, GetOneRoute, ListChildrenRoute, ListRoute, PatchRoute, RemoveRoute } from "./tasks.routes";

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
  const taskData = c.req.valid("json");

  if (taskData.parentId) {
    const parentId = taskData.parentId;
    if (!parentId) {
      return c.json(
        {
          success: false,
          error: {
            issues: [
              {
                code: "invalid_reference",
                path: ["parentId"],
                message: "Parent task ID is required",
              },
            ],
            name: "ValidationError",
          },
        },
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
      );
    }

    const parentTask = await db.query.tasks.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, parentId);
      },
    });

    if (!parentTask) {
      return c.json(
        {
          success: false,
          error: {
            issues: [
              {
                code: "invalid_reference",
                path: ["parentId"],
                message: "Parent task not found",
              },
            ],
            name: "ValidationError",
          },
        },
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
  }

  // Get authenticated user if available and set as owner
  const user = c.get("user");
  const taskToInsert = {
    ...taskData,
    ...(user ? { owner: user.id } : {}),
  };

  const inserted = await db.insert(tasks).values({
    ...taskToInsert,
    priority: taskToInsert.priority && typeof taskToInsert.priority === "string" ? taskToInsert.priority : "MEDIUM",
    status: taskToInsert.status && typeof taskToInsert.status === "string" ? taskToInsert.status : "TODO",
  }).returning().get();
  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
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

  return c.json(task, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  const hasValidUpdates = Object.values(updates).some(value => value !== undefined && value !== null);

  if (!hasValidUpdates) {
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

  // First, get the existing task to check ownership
  const existingTask = await db.query.tasks.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!existingTask) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership if task has an owner
  if (existingTask.owner) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to update this task",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (existingTask.owner !== user.id) {
      return c.json(
        {
          message: "You can only update tasks you own",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  // Filter out any invalid enum values and keep only string values
  const cleanUpdates: any = { ...updates };

  // Clean priority field
  if (updates.priority !== undefined) {
    if (typeof updates.priority === "string" && ["LOW", "MEDIUM", "HIGH"].includes(updates.priority)) {
      cleanUpdates.priority = updates.priority;
    }
    else {
      delete cleanUpdates.priority;
    }
  }

  // Clean status field
  if (updates.status !== undefined) {
    if (typeof updates.status === "string" && ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"].includes(updates.status)) {
      cleanUpdates.status = updates.status;
    }
    else {
      delete cleanUpdates.status;
    }
  }

  const task = await db
    .update(tasks)
    .set(cleanUpdates)
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

  // Check ownership if task has an owner
  if (task && task.owner) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to delete this task",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (task.owner !== user.id) {
      return c.json(
        {
          message: "You can only delete tasks you own",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  const result = await db.delete(tasks).where(eq(tasks.id, id));

  if (result.changes === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
