import type { z } from "zod/v4";

import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { selectProductsSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { products } from "@/db/schema";
import { notFoundSchema, ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { emitWebhookEvent } from "@/lib/webhook-service";
import { wsManager } from "@/routes/websockets/websocket.manager";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./products.routes";

export type Product = z.infer<typeof selectProductsSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { all, page, limit, category, search, featured, published, sort = "DESC" } = c.req.valid("query");

  // Build where conditions
  const whereConditions = [];
  if (category)
    whereConditions.push(eq(products.category, category));
  if (featured !== undefined)
    whereConditions.push(eq(products.featured, featured));
  if (published !== undefined)
    whereConditions.push(eq(products.published, published));
  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(
      sql`(${products.name} LIKE ${searchPattern} OR ${products.description} LIKE ${searchPattern})`,
    );
  }

  const orderBy = sort === "ASC" ? [asc(products.createdAt)] : [desc(products.createdAt)];

  if (all) {
    const productsList = await db.query.products.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit: 200,
      orderBy,
    });
    return c.json(productsList as Product[], HttpStatusCodes.OK);
  }
  else {
    const offset = (page - 1) * limit;

    const [productsList, totalResult] = await Promise.all([
      db.query.products.findMany({
        where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
        limit,
        offset,
        orderBy,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined)
        .get(),
    ]);

    if (!totalResult) {
      return c.json({
        data: [] as Product[],
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
      data: productsList as Product[],
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

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const productData = c.req.valid("json");

  // Get authenticated user if available and set as owner
  const user = c.get("user");
  const productToInsert = {
    ...productData,
    ...(user ? { owner: user.id } : {}),
  };

  const inserted = await db.insert(products).values(productToInsert).returning().get();

  // Broadcast product creation to WebSocket clients
  wsManager.broadcast("products", {
    type: "product.created",
    data: inserted,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_CREATED, { productCreated: inserted });

  // Emit webhook event
  emitWebhookEvent("product.created", inserted).catch(console.error);

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const product = await db.query.products.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!product) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(product, HttpStatusCodes.OK);
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

  // First, get the existing product to check ownership
  const existingProduct = await db.query.products.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!existingProduct) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership if product has an owner
  if (existingProduct.owner) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to update this product",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (existingProduct.owner !== user.id) {
      return c.json(
        {
          message: "You can only update products you own",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  // Build update object with proper types
  const updateData: Partial<typeof existingProduct> = {};

  // Copy all valid update fields
  if (updates.name !== undefined)
    updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.price !== undefined)
    updateData.price = updates.price;
  if (updates.compareAtPrice !== undefined)
    updateData.compareAtPrice = updates.compareAtPrice;
  if (updates.sku !== undefined)
    updateData.sku = updates.sku;
  if (updates.barcode !== undefined)
    updateData.barcode = updates.barcode;
  if (updates.quantity !== undefined)
    updateData.quantity = updates.quantity;
  if (updates.category !== undefined)
    updateData.category = updates.category;
  if (updates.tags !== undefined)
    updateData.tags = updates.tags;
  if (updates.images !== undefined)
    updateData.images = updates.images;
  if (updates.featured !== undefined)
    updateData.featured = updates.featured;
  if (updates.published !== undefined)
    updateData.published = updates.published;

  const product = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning()
    .get();

  if (!product) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast product update to WebSocket clients
  wsManager.broadcast("products", {
    type: "product.updated",
    data: product,
    timestamp: new Date().toISOString(),
  });

  // Also broadcast to specific product channel
  wsManager.broadcast(`product:${product.id}`, {
    type: "product.updated",
    data: product,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_UPDATED, { productUpdated: product });

  // Emit webhook event
  emitWebhookEvent("product.updated", product).catch(console.error);

  return c.json(product, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const product = await db.query.products.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!product) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership if product has an owner
  if (product.owner) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to delete this product",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (product.owner !== user.id) {
      return c.json(
        {
          message: "You can only delete products you own",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  const result = await db.delete(products).where(eq(products.id, id));

  if (result.changes === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast product deletion to WebSocket clients
  wsManager.broadcast("products", {
    type: "product.deleted",
    data: { id },
    timestamp: new Date().toISOString(),
  });

  // Also broadcast to specific product channel
  wsManager.broadcast(`product:${id}`, {
    type: "product.deleted",
    data: { id },
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_DELETED, { productDeleted: { id } });

  // Emit webhook event
  emitWebhookEvent("product.deleted", { id }).catch(console.error);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
