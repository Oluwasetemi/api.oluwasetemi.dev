import { ApolloServer } from "@apollo/server";
import { createSchema } from "drizzle-graphql";

import { createRouter } from "@/lib/create-app";
import db from "@/db";
import * as schema from "@/db/schema";

const { typeDefs, resolvers } = createSchema({ schema });

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

let started = false;
async function ensureStarted() {
  if (!started) {
    await server.start();
    started = true;
  }
}

const router = createRouter();

router.all("/graphql", async (c) => {
  await ensureStarted();
  const req = c.req;
  const body = req.method === "GET" ? undefined : await req.json();

  const response = await server.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: req.method,
      headers: Object.fromEntries(req.raw.headers.entries()),
      search: new URL(req.url).search,
      body,
    },
    context: async () => ({ db }),
  });

  for (const [key, value] of response.headers) {
    c.header(key, value);
  }

  let payload = "";
  if (response.body.kind === "complete") {
    payload = response.body.string;
  }
  else {
    for await (const chunk of response.body.asyncIterator) {
      payload += chunk;
    }
  }

  return c.newResponse(payload, response.status ?? 200);
});

export default router;
