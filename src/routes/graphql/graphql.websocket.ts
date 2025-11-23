// GraphQL WebSocket subscription handler using Hono WebSocket
import type { WSContext } from "hono/ws";

import { parse, subscribe } from "graphql";

import db from "@/db";
import { AuthService, extractBearerToken } from "@/lib/auth";
import { formatUserForGraphQL, getUserWithTimestamps } from "@/utils/time";

import { schema } from "./graphql.schema";

type GraphQLMessage
  = | { type: "connection_init"; payload?: Record<string, any> }
    | { type: "ping"; payload?: Record<string, any> }
    | { type: "pong"; payload?: Record<string, any> }
    | {
      type: "subscribe";
      id: string;
      payload: { query: string; variables?: Record<string, any>; operationName?: string };
    }
    | { type: "complete"; id: string };

type SubscriptionContext = {
  ws: WSContext;
  subscriptions: Map<string, AsyncIterator<any>>;
  user: any;
};

async function getUserFromToken(token: string) {
  try {
    const payload = await AuthService.verifyAccessToken(token);

    if (!payload.isActive) {
      return null;
    }

    const user = await getUserWithTimestamps(payload);

    if (!user) {
      return null;
    }

    return formatUserForGraphQL(user);
  }
  catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export function createGraphQLWebSocketHandler() {
  return {
    onOpen: async (_evt: Event, ws: WSContext) => {
      // Connection established

      // Initialize subscription context
      const context: SubscriptionContext = {
        ws,
        subscriptions: new Map(),
        user: null,
      };

      // Store context in ws
      (ws as any).subscriptionContext = context;
    },

    onMessage: async (evt: MessageEvent, ws: WSContext) => {
      try {
        const message: GraphQLMessage = JSON.parse(evt.data.toString());
        const context: SubscriptionContext = (ws as any).subscriptionContext;

        switch (message.type) {
          case "connection_init": {
            // Extract authentication from connection params
            const authToken = message.payload?.authorization;
            if (authToken) {
              try {
                const token = extractBearerToken(authToken) || authToken;
                context.user = await getUserFromToken(token);
              }
              catch (error) {
                console.error("[GraphQL WS] Auth error:", error);
              }
            }

            // Send connection acknowledgement
            ws.send(JSON.stringify({ type: "connection_ack" }));
            // Connection acknowledged
            break;
          }

          case "ping": {
            ws.send(JSON.stringify({ type: "pong", payload: message.payload }));
            break;
          }

          case "subscribe": {
            // Process subscribe message
            const { id, payload } = message;
            // Subscribe request received

            try {
              // Parse and validate the query
              const document = parse(payload.query);

              // Create execution context
              const executionContext = {
                db,
                user: context.user,
              };

              // Execute the subscription
              const result = await subscribe({
                schema,
                document,
                variableValues: payload.variables,
                operationName: payload.operationName,
                contextValue: executionContext,
              });

              // Handle execution errors
              if ("errors" in result && result.errors) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    id,
                    payload: result.errors.map(err => ({
                      message: err.message,
                      locations: err.locations,
                      path: err.path,
                    })),
                  }),
                );
                return;
              }

              // Check if result is an async iterator (subscription)
              if (!(Symbol.asyncIterator in result) || typeof (result as any)[Symbol.asyncIterator] !== "function") {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    id,
                    payload: [{ message: "Expected subscription to return an async iterator" }],
                  }),
                );
                return;
              }

              // Type guard to ensure result is an async iterable
              const asyncIterableResult = result as AsyncIterable<any>;

              // Store the subscription iterator
              context.subscriptions.set(id, asyncIterableResult[Symbol.asyncIterator]());

              // Listen for subscription events
              (async () => {
                try {
                  for await (const value of asyncIterableResult) {
                    ws.send(
                      JSON.stringify({
                        type: "next",
                        id,
                        payload: value,
                      }),
                    );
                  }

                  // Subscription completed
                  ws.send(JSON.stringify({ type: "complete", id }));
                  context.subscriptions.delete(id);
                }
                catch (error) {
                  console.error(`[GraphQL WS] Subscription ${id} error:`, error);
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      id,
                      payload: [{ message: error instanceof Error ? error.message : "Unknown error" }],
                    }),
                  );
                  context.subscriptions.delete(id);
                }
              })();
            }
            catch (error) {
              console.error(`[GraphQL WS] Subscribe error for ${id}:`, error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  id,
                  payload: [{ message: error instanceof Error ? error.message : "Unknown error" }],
                }),
              );
            }
            break;
          }

          case "complete": {
            // Client wants to stop a subscription
            const { id } = message;
            const iterator = context.subscriptions.get(id);
            if (iterator && typeof iterator.return === "function") {
              await iterator.return();
            }
            context.subscriptions.delete(id);
            // Subscription completed
            break;
          }

          default:
            console.warn("[GraphQL WS] Unknown message type:", (message as any).type);
        }
      }
      catch (error) {
        console.error("[GraphQL WS] Message handling error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: [{ message: "Invalid message format" }],
          }),
        );
      }
    },

    onClose: async (evt: CloseEvent, ws: WSContext) => {
      // Client disconnected

      // Clean up all subscriptions
      const context: SubscriptionContext = (ws as any).subscriptionContext;
      if (context && context.subscriptions) {
        for (const [_id, iterator] of context.subscriptions.entries()) {
          if (iterator && typeof iterator.return === "function") {
            await iterator.return();
          }
        }
        context.subscriptions.clear();
      }
    },

    onError: (evt: Event, _ws: WSContext) => {
      console.error("[GraphQL WS] WebSocket error:", evt);
    },
  };
}
