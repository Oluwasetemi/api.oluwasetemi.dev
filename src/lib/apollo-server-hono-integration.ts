// apollo-server-hono-integration.ts
import type {
  ApolloServer,
  BaseContext,
  ContextFunction,
  HTTPGraphQLRequest,
} from "@apollo/server";
import type { Context } from "hono";

export type HonoContextFunctionArgument = {
  req: Context["req"];
  c: Context;
};

export type HonoIntegrationOptions<TContext extends BaseContext = BaseContext> = {
  context?: ContextFunction<[HonoContextFunctionArgument], TContext>;
};

export function startServerAndCreateHonoHandler<TContext extends BaseContext = BaseContext>(
  server: ApolloServer<TContext>,
  options?: HonoIntegrationOptions<TContext>,
) {
  let started = false;

  const ensureStarted = async () => {
    if (!started) {
      await server.start();
      started = true;
    }
  };

  return async (c: Context) => {
    try {
      await ensureStarted();

      const req = c.req;
      let body: any;

      // Handle request body
      if (
        req.method !== "GET"
        && req.header("content-type")?.includes("application/json")
      ) {
        try {
          body = await req.json();
        }
        catch (e) {
          console.log(e);
          return c.json(
            { errors: [{ message: "Invalid JSON in request body" }] },
            400,
          );
        }
      }

      // Create HeaderMap compatible object
      const headerMap = new Map<string, string>();
      req.raw.headers.forEach((value, key) => {
        headerMap.set(key, value);
      });

      // Create HTTPGraphQLRequest
      const httpGraphQLRequest: HTTPGraphQLRequest = {
        method: req.method as "GET" | "POST",
        headers: headerMap as any, // Cast to satisfy Apollo Server's HeaderMap type
        search: new URL(req.url).search,
        body,
      };

      // Create context
      const contextValue = options?.context
        ? await options.context({ req, c })
        : ({} as TContext);

      const response = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: async () => contextValue,
      });

      // Set response headers
      for (const [key, value] of response.headers) {
        c.header(key, value);
      }

      // Handle response body
      let payload = "";
      if (response.body.kind === "complete") {
        payload = response.body.string;
      }
      else {
        for await (const chunk of response.body.asyncIterator) {
          payload += chunk;
        }
      }

      return c.newResponse(payload, (response.status ?? 200) as any);
    }
    catch (error) {
      console.error("GraphQL execution error:", error);
      return c.json({ errors: [{ message: "Internal server error" }] }, 500);
    }
  };
}
