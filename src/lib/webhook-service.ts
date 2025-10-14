import { eq } from "drizzle-orm";

import db from "@/db";
import { webhookEvents } from "@/db/schema";

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
    console.log(`[Webhook] Subscription ${subscription.id} is inactive, skipping delivery`);
    return;
  }

  const payload = event.payload;
  const timestamp = new Date().toISOString();

  // Generate signature
  const signature = await generateWebhookSignature(payload, subscription.secret);

  try {
    const startTime = Date.now();

    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event.eventType,
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-ID": event.id,
      },
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

      console.log(`[Webhook] Delivered event ${eventId} to ${subscription.url} (${responseTime}ms, ${response.status})`);
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

        console.log(`[Webhook] Failed to deliver event ${eventId}, will retry at ${nextRetry.toISOString()} (attempt ${newAttempts}/${subscription.maxRetries})`);

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

      console.log(`[Webhook] Network error for event ${eventId}, will retry at ${nextRetry.toISOString()}`);

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

  console.log(`[Webhook] Processing ${pendingEvents.length} pending retries`);

  for (const event of pendingEvents) {
    deliverWebhook(event.id).catch(console.error);
  }
}
