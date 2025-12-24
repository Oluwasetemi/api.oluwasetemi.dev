import { eq } from "drizzle-orm";

import db from "@/db";
import { webhookEvents } from "@/db/schema";

// Check if URL is a Discord webhook
function isDiscordWebhook(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return (hostname === "discord.com" || hostname === "discordapp.com")
      && parsedUrl.pathname.startsWith("/api/webhooks");
  }
  catch {
    return false;
  }
}

const DISCORD_EMBED_COLORS = {
  DEFAULT: 5814783, // Blue
  CREATED: 3066993, // Green
  UPDATED: 15844367, // Yellow/Gold
  DELETED: 15158332, // Red
  PUBLISHED: 10181046, // Purple
} as const;

// Transform generic webhook payload to Discord format
function transformToDiscordPayload(payload: string): string {
  try {
    const data = JSON.parse(payload);
    const { event, timestamp, data: eventData } = data;

    // Create a human-readable event title
    const eventTitle = event
      .split(".")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Determine embed color based on event type
    let color: number = DISCORD_EMBED_COLORS.DEFAULT;
    if (event.includes("created")) {
      color = DISCORD_EMBED_COLORS.CREATED;
    }
    else if (event.includes("updated")) {
      color = DISCORD_EMBED_COLORS.UPDATED;
    }
    else if (event.includes("deleted")) {
      color = DISCORD_EMBED_COLORS.DELETED;
    }
    else if (event.includes("published")) {
      color = DISCORD_EMBED_COLORS.PUBLISHED;
    }

    // Build fields from event data
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    // Extract key information from the event data
    const extractFields = (obj: Record<string, unknown>, prefix = ""): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined)
          continue;

        // Skip deeply nested objects and arrays for clarity
        if (typeof value === "object" && !Array.isArray(value)) {
          // Only go one level deep for the first object
          if (prefix === "") {
            extractFields(value as Record<string, unknown>, key);
          }
          continue;
        }

        const fieldName = prefix ? `${prefix}.${key}` : key;
        let fieldValue = String(value);

        // Limit field value length
        if (fieldValue.length > 100) {
          fieldValue = `${fieldValue.substring(0, 97)}...`;
        }

        // Format timestamps
        if (key.includes("At") || key === "timestamp") {
          try {
            if (typeof value === "string" || typeof value === "number") {
              fieldValue = new Date(value).toLocaleString();
            }
          }
          catch {
            // Keep original value if not a valid date
          }
        }

        fields.push({
          name: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
          value: fieldValue,
          inline: true,
        });

        // Limit to 10 fields (Discord limit is 25, but we keep it reasonable)
        if (fields.length >= 10)
          return;
      }
    };

    extractFields(eventData);

    // Create Discord embed payload
    const discordPayload = {
      embeds: [
        {
          title: eventTitle,
          description: `Event: \`${event}\``,
          color,
          fields,
          timestamp,
          footer: {
            text: "Webhook Event",
          },
        },
      ],
    };

    return JSON.stringify(discordPayload);
  }
  catch (error) {
    console.error("[Webhook] Failed to transform payload to Discord format:", error);
    // Fallback to simple text message
    const truncatedPayload = payload.substring(0, 100);
    const content = `Webhook event received: ${truncatedPayload}...`;
    return JSON.stringify({
      content: content.substring(0, 2000), // Discord content limit
    });
  }
}

// Generate HMAC signature for webhook payload
export async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verify webhook signature
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expectedSignature = await generateWebhookSignature(payload, secret);
  return signature === expectedSignature;
}

// Calculate next retry time using exponential backoff
function calculateNextRetry(attempts: number, backoff: string): Date {
  const now = Date.now();

  if (backoff === "linear") {
    // Linear: 1min, 2min, 3min, 4min, 5min, 6min
    const minutes = attempts + 1;
    return new Date(now + minutes * 60 * 1000);
  }

  // Exponential: 1min, 5min, 15min, 1hr, 6hr, 24hr
  const backoffMinutes = [1, 5, 15, 60, 360, 1440];
  const minutes = backoffMinutes[Math.min(attempts, backoffMinutes.length - 1)];
  return new Date(now + minutes * 60 * 1000);
}

// Deliver a webhook
export async function deliverWebhook(eventId: string): Promise<void> {
  const event = await db.query.webhookEvents.findFirst({
    where: (fields, { eq }) => eq(fields.id, eventId),
  });

  if (!event) {
    console.error(`[Webhook] Event ${eventId} not found`);
    return;
  }

  const subscription = await db.query.webhookSubscriptions.findFirst({
    where: (fields, { eq }) => eq(fields.id, event.subscriptionId),
  });

  if (!subscription) {
    console.error(`[Webhook] Subscription ${event.subscriptionId} not found`);
    return;
  }

  if (!subscription.active) {
    console.warn(`[Webhook] Subscription ${subscription.id} is inactive, skipping delivery`);
    return;
  }

  let payload = event.payload;
  const timestamp = new Date().toISOString();
  const isDiscord = isDiscordWebhook(subscription.url);

  // Transform payload for Discord webhooks
  if (isDiscord) {
    payload = transformToDiscordPayload(payload);
  }

  // Generate signature for non-Discord webhooks
  const signature = isDiscord ? "" : await generateWebhookSignature(payload, subscription.secret);

  try {
    const startTime = Date.now();

    // Build headers based on webhook type
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Discord doesn't need/want custom webhook headers
    if (!isDiscord) {
      headers["X-Webhook-Event"] = event.eventType;
      headers["X-Webhook-Signature"] = signature;
      headers["X-Webhook-Timestamp"] = timestamp;
      headers["X-Webhook-ID"] = event.id;
    }

    const response = await fetch(subscription.url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      // Success
      await db
        .update(webhookEvents)
        .set({
          status: "delivered",
          attempts: event.attempts + 1,
          lastAttempt: new Date(),
          responseCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit response body storage
        })
        .where(eq(webhookEvents.id, eventId));

      const webhookType = isDiscord ? "Discord webhook" : "webhook";
      console.warn(`[Webhook] Delivered event ${eventId} to ${webhookType} ${subscription.url} (${responseTime}ms, ${response.status})`);
    }
    else {
      // Failed, schedule retry
      const newAttempts = event.attempts + 1;
      const shouldRetry = newAttempts < subscription.maxRetries;

      if (shouldRetry) {
        const nextRetry = calculateNextRetry(newAttempts, subscription.retryBackoff);

        await db
          .update(webhookEvents)
          .set({
            attempts: newAttempts,
            lastAttempt: new Date(),
            nextRetry,
            responseCode: response.status,
            responseBody: responseBody.substring(0, 1000),
            errorMessage: `HTTP ${response.status}: ${response.statusText}`,
          })
          .where(eq(webhookEvents.id, eventId));

        console.warn(`[Webhook] Failed to deliver event ${eventId}, will retry at ${nextRetry.toISOString()} (attempt ${newAttempts}/${subscription.maxRetries})`);

        // Schedule retry
        const delay = nextRetry.getTime() - Date.now();
        setTimeout(() => {
          deliverWebhook(eventId).catch(console.error);
        }, delay);
      }
      else {
        // Max retries exceeded
        await db
          .update(webhookEvents)
          .set({
            status: "failed",
            attempts: newAttempts,
            lastAttempt: new Date(),
            responseCode: response.status,
            responseBody: responseBody.substring(0, 1000),
            errorMessage: `Max retries (${subscription.maxRetries}) exceeded. Last error: HTTP ${response.status}`,
          })
          .where(eq(webhookEvents.id, eventId));

        console.error(`[Webhook] Failed to deliver event ${eventId} after ${newAttempts} attempts`);
      }
    }
  }
  catch (error) {
    // Network error or timeout
    const newAttempts = event.attempts + 1;
    const shouldRetry = newAttempts < subscription.maxRetries;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (shouldRetry) {
      const nextRetry = calculateNextRetry(newAttempts, subscription.retryBackoff);

      await db
        .update(webhookEvents)
        .set({
          attempts: newAttempts,
          lastAttempt: new Date(),
          nextRetry,
          errorMessage: `Network error: ${errorMessage}`,
        })
        .where(eq(webhookEvents.id, eventId));

      console.warn(`[Webhook] Network error for event ${eventId}, will retry at ${nextRetry.toISOString()}`);

      // Schedule retry
      const delay = nextRetry.getTime() - Date.now();
      setTimeout(() => {
        deliverWebhook(eventId).catch(console.error);
      }, delay);
    }
    else {
      await db
        .update(webhookEvents)
        .set({
          status: "failed",
          attempts: newAttempts,
          lastAttempt: new Date(),
          errorMessage: `Max retries exceeded. Last error: ${errorMessage}`,
        })
        .where(eq(webhookEvents.id, eventId));

      console.error(`[Webhook] Failed to deliver event ${eventId} after network errors:`, errorMessage);
    }
  }
}

// Emit a webhook event to all subscribed webhooks
export async function emitWebhookEvent(eventType: string, data: any): Promise<void> {
  // Find all active subscriptions that include this event type
  const subscriptions = await db.query.webhookSubscriptions.findMany({
    where: (fields, { eq }) => eq(fields.active, true),
  });

  const payload = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  });

  for (const subscription of subscriptions) {
    try {
      const events = JSON.parse(subscription.events) as string[];

      // Check if this subscription is listening for this event
      if (events.includes(eventType) || events.includes("*")) {
        // Create webhook event
        const event = await db
          .insert(webhookEvents)
          .values({
            subscriptionId: subscription.id,
            eventType,
            payload,
            status: "pending",
          })
          .returning()
          .get();

        // Deliver immediately in the background
        deliverWebhook(event.id).catch(console.error);
      }
    }
    catch (error) {
      console.error(`[Webhook] Error processing subscription ${subscription.id}:`, error);
    }
  }
}

// Process pending retries (call this on server startup)
export async function processPendingRetries(): Promise<void> {
  const now = new Date();

  const pendingEvents = await db.query.webhookEvents.findMany({
    where: (fields, { and, eq, lte }) => and(
      eq(fields.status, "pending"),
      lte(fields.nextRetry, now),
    ),
    limit: 100,
  });

  console.warn(`[Webhook] Processing ${pendingEvents.length} pending retries`);

  for (const event of pendingEvents) {
    deliverWebhook(event.id).catch(console.error);
  }
}
