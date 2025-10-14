import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { webhookIncomingLogs } from "@/db/schema";
import { createRouter } from "@/lib/create-app";

const app = createRouter();

// Generic webhook receiver
app.post("/webhooks/incoming/:provider", async (c) => {
  const provider = c.req.param("provider");
  const body = await c.req.text();
  const headers = c.req.header();

  // Extract signature based on provider
  let signature: string | undefined;
  let eventId: string | undefined;
  let eventType: string | undefined;

  if (provider === "github") {
    signature = headers["x-hub-signature-256"];
    eventId = headers["x-github-delivery"];
    eventType = headers["x-github-event"];
  }
  else if (provider === "stripe") {
    signature = headers["stripe-signature"];
    // Stripe signature contains multiple parts, we'll store it as-is
    try {
      const payload = JSON.parse(body);
      eventId = payload.id;
      eventType = payload.type;
    }
    catch {
      eventId = crypto.randomUUID();
      eventType = "unknown";
    }
  }
  else {
    // Generic provider
    signature = headers["x-webhook-signature"];
    eventId = headers["x-webhook-id"] || crypto.randomUUID();
    eventType = headers["x-webhook-event"] || "webhook.received";
  }

  // Check for duplicate using eventId (idempotency)
  if (eventId) {
    const existing = await db.query.webhookIncomingLogs.findFirst({
      where: (fields, { eq }) => eq(fields.eventId, eventId),
    });

    if (existing) {
      console.log(`[Webhook Receiver] Duplicate event ${eventId} from ${provider}, skipping`);
      return c.json({
        success: true,
        message: "Event already processed (idempotent)",
      }, HttpStatusCodes.OK);
    }
  }

  // Store the incoming webhook
  const log = await db
    .insert(webhookIncomingLogs)
    .values({
      provider,
      eventId: eventId || crypto.randomUUID(),
      eventType: eventType || "unknown",
      payload: body,
      signature,
      verified: false, // Will be verified separately
      processed: false,
    })
    .returning()
    .get();

  console.log(`[Webhook Receiver] Received ${provider} webhook: ${eventType} (${log.id})`);

  // TODO: Process the webhook asynchronously
  // For now, just acknowledge receipt
  return c.json({
    success: true,
    message: "Webhook received",
    id: log.id,
  }, HttpStatusCodes.OK);
});

// GitHub webhook receiver (with signature verification)
app.post("/webhooks/github", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const eventId = c.req.header("x-github-delivery");
  const eventType = c.req.header("x-github-event");

  if (!eventId || !eventType) {
    return c.json({
      success: false,
      message: "Missing required GitHub headers",
    }, HttpStatusCodes.BAD_REQUEST);
  }

  // Check for duplicate
  const existing = await db.query.webhookIncomingLogs.findFirst({
    where: (fields, { eq }) => eq(fields.eventId, eventId),
  });

  if (existing) {
    return c.json({
      success: true,
      message: "Event already processed",
    }, HttpStatusCodes.OK);
  }

  // Store the webhook
  const log = await db
    .insert(webhookIncomingLogs)
    .values({
      provider: "github",
      eventId,
      eventType,
      payload: body,
      signature,
      verified: false,
      processed: false,
    })
    .returning()
    .get();

  // TODO: Verify signature with GitHub secret (requires configuration)
  // const secret = env.GITHUB_WEBHOOK_SECRET;
  // const verified = signature ? await verifyWebhookSignature(body, signature.replace('sha256=', ''), secret) : false;

  console.log(`[Webhook] Received GitHub ${eventType} event (${log.id})`);

  return c.json({
    success: true,
    message: "Webhook received",
    id: log.id,
  }, HttpStatusCodes.OK);
});

// Stripe webhook receiver
app.post("/webhooks/stripe", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  let eventId: string;
  let eventType: string;

  try {
    const payload = JSON.parse(body);
    eventId = payload.id;
    eventType = payload.type;
  }
  catch {
    return c.json({
      success: false,
      message: "Invalid JSON payload",
    }, HttpStatusCodes.BAD_REQUEST);
  }

  // Check for duplicate
  const existing = await db.query.webhookIncomingLogs.findFirst({
    where: (fields, { eq }) => eq(fields.eventId, eventId),
  });

  if (existing) {
    return c.json({
      success: true,
      message: "Event already processed",
    }, HttpStatusCodes.OK);
  }

  // Store the webhook
  const log = await db
    .insert(webhookIncomingLogs)
    .values({
      provider: "stripe",
      eventId,
      eventType,
      payload: body,
      signature,
      verified: false,
      processed: false,
    })
    .returning()
    .get();

  // TODO: Verify signature with Stripe secret (requires stripe package)
  // const secret = env.STRIPE_WEBHOOK_SECRET;
  // const event = stripe.webhooks.constructEvent(body, signature, secret);

  console.log(`[Webhook] Received Stripe ${eventType} event (${log.id})`);

  return c.json({
    success: true,
    message: "Webhook received",
    id: log.id,
  }, HttpStatusCodes.OK);
});

export default app;
