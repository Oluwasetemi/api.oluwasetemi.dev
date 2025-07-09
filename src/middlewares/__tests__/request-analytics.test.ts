import type { Context } from "hono";

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { AppBindings } from "@/lib/types";

import db from "@/db";
import { requests } from "@/db/schema";
import env from "@/env";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";
import { analyticsLogger } from "@/middlewares/request-analytics";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

describe("analytics Middleware", () => {
  let testDbPath: string;
  let originalAnalyticsEnabled: boolean;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
    // Enable analytics for these tests
    originalAnalyticsEnabled = env.ENABLE_ANALYTICS;
    (env as any).ENABLE_ANALYTICS = true;
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
    // Restore original analytics setting
    (env as any).ENABLE_ANALYTICS = originalAnalyticsEnabled;
  });

  it("should log request analytics when middleware is executed", async () => {
    // Create a mock context
    const mockContext = {
      req: {
        method: "GET",
        path: "/api/test",
        header: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            "user-agent": "test-user-agent",
            "x-forwarded-for": "192.168.1.1",
            "referer": "http://localhost:3000",
          };
          return headers[name];
        }),
      },
      res: {
        status: 200,
      },
      env: {},
      get: vi.fn(() => null),
    } as unknown as Context<AppBindings>;

    // Create a mock next function
    const mockNext = vi.fn(async () => {
      // Simulate setting response status during request processing
      (mockContext.res as { status: number }).status = 200;
    });

    // Execute the middleware
    const middleware = analyticsLogger();
    await middleware(mockContext, mockNext);

    // Wait for the microtask to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the request was logged
    const loggedRequests = await db.select().from(requests).all();
    expect(loggedRequests.length).toBeGreaterThan(0);

    const loggedRequest = loggedRequests[0];
    expect(loggedRequest.method).toBe("GET");
    expect(loggedRequest.path).toBe("/api/test");
    expect(loggedRequest.status).toBe(200);
    expect(loggedRequest.durationMs).toBeGreaterThanOrEqual(0);
  });
});
