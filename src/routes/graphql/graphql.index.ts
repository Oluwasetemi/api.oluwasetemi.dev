import { ApolloServer } from "@apollo/server";
import { startServerAndCreateHonoHandler } from "@as-integrations/hono";
import { createSchema } from "drizzle-graphql";

import { createRouter } from "@/lib/create-app";
import db from "@/db";
import * as schema from "@/db/schema";

const { typeDefs, resolvers } = createSchema({ schema });

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const router = createRouter();

router.all(
  "/graphql",
  startServerAndCreateHonoHandler(server, {
    context: async () => ({ db }),
  }),
);

export default router;
