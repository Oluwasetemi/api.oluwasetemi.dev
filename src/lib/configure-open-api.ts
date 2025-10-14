import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "./types";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "API.OLUWASETEMI.DEV",
      description: "List of APIs for learning, teaching, and for fun. I have tasks(todos), analytics, authentication(standalone and better-auth) and more in the pipeline - products, posts, etc.",
    },
  });

  app.get(
    "/reference",
    Scalar({
      url: "/doc",
      theme: "kepler",
      layout: "classic",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "axios",
      },
      sources: [
        { url: "/doc", title: "Main API" },
        { url: "/api/auth/open-api/generate-schema", title: "Better Auth" },
      ],
    }),
  );
}
