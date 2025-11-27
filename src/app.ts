import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import analytics from "@/routes/analytics/analytics.index";
import auth from "@/routes/auth/auth.index";
import betterAuth from "@/routes/better-auth/better-auth.index";
import graphql from "@/routes/graphql/graphql.index";
import index from "@/routes/index.route";
import posts from "@/routes/posts/posts.index";
import products from "@/routes/products/products.index";
import sse from "@/routes/sse/sse.index";
import tasks from "@/routes/tasks/tasks.index";
import webhooks from "@/routes/webhooks/webhooks.index";
import webhookReceiver from "@/routes/webhooks/webhooks.receiver";
import websockets from "@/routes/websockets/websocket.index";

import { sendEmail } from "./lib/email";

const app = createApp();

configureOpenAPI(app);

app.get("/health", async (c) => {
  return c.json({ message: "OK" });
});

app.get("/email/test", async (c) => {
  const data = await sendEmail({
    to: "setemiojo@gmail.com",
    subject: "Hello world",
    text: "Hello world",
    html: "<h1>Hello world</h1>",
  });
  return c.json(data);
});

app.post("/email", async (c) => {
  const { to, subject, text, html } = await c.req.json();
  const data = await sendEmail({
    to,
    subject,
    text,
    html,
  });
  return c.json(data);
});

const routes = [index, tasks, products, posts, graphql, analytics, auth, betterAuth, webhooks, webhookReceiver, websockets, sse] as const;

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = (typeof routes)[number];

export default app;
