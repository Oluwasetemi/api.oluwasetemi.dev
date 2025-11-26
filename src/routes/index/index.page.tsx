import type { FC } from "hono/jsx";

import { createRouter } from "@/lib/create-app";
import { Layout } from "@/lib/layout";

const app = createRouter();

// API Routes mapping with documentation URLs
const apiRoutes = {
  tasks: [
    {
      method: "GET",
      path: "/tasks",
      actions: ["middleware", "list"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/get/tasks",
    },
    {
      method: "GET",
      path: "/tasks/:id/children",
      actions: ["middleware", "middleware", "listChildren"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/get/tasks/{id}/children",
    },
    {
      method: "POST",
      path: "/tasks",
      actions: ["middleware", "create"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/post/tasks",
    },
    {
      method: "GET",
      path: "/tasks/:id",
      actions: ["middleware", "getOne"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/get/tasks/{id}",
    },
    {
      method: "PATCH",
      path: "/tasks/:id",
      actions: ["middleware", "middleware", "patch"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/patch/tasks/{id}",
    },
    {
      method: "DELETE",
      path: "/tasks/:id",
      actions: ["middleware", "remove"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/tasks/delete/tasks/{id}",
    },
  ],
  products: [
    {
      method: "GET",
      path: "/products",
      actions: ["middleware", "list"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/products/get/products",
    },
    {
      method: "POST",
      path: "/products",
      actions: ["middleware", "create"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/products/post/products",
    },
    {
      method: "GET",
      path: "/products/:id",
      actions: ["middleware", "getOne"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/products/get/products/{id}",
    },
    {
      method: "PATCH",
      path: "/products/:id",
      actions: ["middleware", "middleware", "patch"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/products/patch/products/{id}",
    },
    {
      method: "DELETE",
      path: "/products/:id",
      actions: ["middleware", "remove"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/products/delete/products/{id}",
    },
  ],
  posts: [
    {
      method: "GET",
      path: "/posts",
      actions: ["middleware", "list"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/get/posts",
    },
    {
      method: "POST",
      path: "/posts",
      actions: ["middleware", "create"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/post/posts",
    },
    {
      method: "GET",
      path: "/posts/:id",
      actions: ["middleware", "getOne"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/get/posts/{id}",
    },
    {
      method: "GET",
      path: "/posts/slug/:slug",
      actions: ["middleware", "getBySlug"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/get/posts/slug/{slug}",
    },
    {
      method: "PATCH",
      path: "/posts/:id",
      actions: ["middleware", "middleware", "patch"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/patch/posts/{id}",
    },
    {
      method: "DELETE",
      path: "/posts/:id",
      actions: ["middleware", "remove"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/posts/delete/posts/{id}",
    },
  ],
  auth: [
    {
      method: "POST",
      path: "/auth/register",
      actions: ["middleware", "register"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/auth/post/auth/register",
    },
    {
      method: "POST",
      path: "/auth/login",
      actions: ["middleware", "login"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/auth/post/auth/login",
    },
    {
      method: "POST",
      path: "/auth/refresh",
      actions: ["middleware", "refresh"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/auth/post/auth/refresh",
    },
    {
      method: "GET",
      path: "/auth/me",
      actions: ["me"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/auth/get/auth/me",
    },
  ],
  webhooks: [
    {
      method: "GET",
      path: "/webhooks/subscriptions",
      actions: ["middleware", "list"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/get/webhooks/subscriptions",
    },
    {
      method: "POST",
      path: "/webhooks/subscriptions",
      actions: ["middleware", "create"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/post/webhooks/subscriptions",
    },
    {
      method: "GET",
      path: "/webhooks/subscriptions/:id",
      actions: ["middleware", "getOne"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/get/webhooks/subscriptions/{id}",
    },
    {
      method: "PATCH",
      path: "/webhooks/subscriptions/:id",
      actions: ["middleware", "middleware", "patch"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/patch/webhooks/subscriptions/{id}",
    },
    {
      method: "DELETE",
      path: "/webhooks/subscriptions/:id",
      actions: ["middleware", "remove"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/delete/webhooks/subscriptions/{id}",
    },
    {
      method: "POST",
      path: "/webhooks/subscriptions/:id/test",
      actions: ["middleware", "test"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/post/webhooks/subscriptions/{id}/test",
    },
    {
      method: "GET",
      path: "/webhooks/events",
      actions: ["middleware", "listEvents"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/get/webhooks/events",
    },
    {
      method: "POST",
      path: "/webhooks/events/:id/retry",
      actions: ["middleware", "retryEvent"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/webhooks/post/webhooks/events/{id}/retry",
    },
  ],
  graphql: [
    {
      method: "ALL",
      path: "/graphql",
      actions: ["middleware", "handler"],
      docsUrl: "https://api.oluwasetemi.dev/graphql",
    },
    {
      method: "GET",
      path: "/playground",
      actions: ["playground"],
      docsUrl: "https://api.oluwasetemi.dev/playground",
    },
    {
      method: "GET",
      path: "/subscription-tester",
      actions: ["subscriptionTester"],
      docsUrl: "https://api.oluwasetemi.dev/subscription-tester",
    },
  ],
  analytics: [
    {
      method: "GET",
      path: "/analytics/requests",
      actions: ["middleware", "getRequests"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/analytics/get/analytics/requests",
    },
    {
      method: "GET",
      path: "/analytics/counts",
      actions: ["middleware", "getCounts"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/analytics/get/analytics/counts",
    },
  ],
  websocket: [
    {
      method: "GET",
      path: "/ws/tasks",
      actions: ["upgradeWebSocket"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/tasks",
    },
    {
      method: "GET",
      path: "/ws/products",
      actions: ["upgradeWebSocket"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/products",
    },
    {
      method: "GET",
      path: "/ws/posts",
      actions: ["upgradeWebSocket"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/posts",
    },
    {
      method: "GET",
      path: "/ws/client/tasks",
      actions: ["client"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/tasks",
    },
    {
      method: "GET",
      path: "/ws/client/products",
      actions: ["client"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/products",
    },
    {
      method: "GET",
      path: "/ws/client/posts",
      actions: ["client"],
      docsUrl: "https://api.oluwasetemi.dev/ws/client/posts",
    },
    {
      method: "GET",
      path: "/ws/stats",
      actions: ["stats"],
      docsUrl: "https://api.oluwasetemi.dev/ws/stats",
    },
    {
      method: "GET",
      path: "/ws/health",
      actions: ["health"],
      docsUrl: "https://api.oluwasetemi.dev/ws/health",
    },
  ],
  sse: [
    {
      method: "GET",
      path: "/sse/tasks",
      actions: ["tasksStream"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/sse/get/sse/tasks",
    },
    {
      method: "GET",
      path: "/sse/products",
      actions: ["productsStream"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/sse/get/sse/products",
    },
    {
      method: "GET",
      path: "/sse/posts",
      actions: ["postsStream"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/sse/get/sse/posts",
    },
    {
      method: "GET",
      path: "/sse/client",
      actions: ["client"],
      docsUrl: "https://api.oluwasetemi.dev/sse/client",
    },
  ],
  root: [
    {
      method: "GET",
      path: "/",
      actions: ["handler"],
      docsUrl: "https://api.oluwasetemi.dev/reference#main-api/tag/root/get/",
    },
  ],
};

/**
 * Return a human-readable description for an API route.
 *
 * @param path - The route path (may include parameter placeholders such as `:id` or `:slug`)
 * @param method - The HTTP method for the route (e.g., `GET`, `POST`, `PATCH`)
 * @returns A short description of the route if known, otherwise the fallback string in the form `METHOD path` (for example, `GET /unknown`)
 */
function getRouteDescription(path: string, method: string): string {
  const descriptions: Record<string, string> = {
    "GET /tasks": "List all tasks with pagination",
    "POST /tasks": "Create a new task",
    "GET /tasks/:id": "Get task by ID",
    "PATCH /tasks/:id": "Update a task",
    "DELETE /tasks/:id": "Delete a task",
    "GET /tasks/:id/children": "Get child tasks",

    "GET /products": "List all products",
    "POST /products": "Create a new product",
    "GET /products/:id": "Get product by ID",
    "PATCH /products/:id": "Update a product",
    "DELETE /products/:id": "Delete a product",

    "GET /posts": "List all posts with filtering",
    "POST /posts": "Create a new post (slug auto-generated)",
    "GET /posts/:id": "Get post by ID or slug",
    "GET /posts/slug/:slug": "Get post by slug",
    "PATCH /posts/:id": "Update a post",
    "DELETE /posts/:id": "Delete a post",

    "POST /auth/register": "Register new user (JWT)",
    "POST /auth/login": "Login user (JWT)",
    "POST /auth/refresh": "Refresh access token",
    "GET /auth/me": "Get current user",

    "GET /webhooks/subscriptions": "List webhook subscriptions",
    "POST /webhooks/subscriptions": "Create webhook subscription",
    "GET /webhooks/subscriptions/:id": "Get subscription details",
    "PATCH /webhooks/subscriptions/:id": "Update subscription",
    "DELETE /webhooks/subscriptions/:id": "Delete subscription",
    "POST /webhooks/subscriptions/:id/test": "Test webhook delivery",
    "GET /webhooks/events": "List webhook events",
    "POST /webhooks/events/:id/retry": "Retry failed webhook",

    "ALL /graphql": "GraphQL endpoint",
    "GET /playground": "GraphQL Playground (Dev only)",
    "GET /subscription-tester": "GraphQL Subscription Tester",

    "GET /analytics/requests": "Get request analytics",
    "GET /analytics/counts": "Get analytics summary",

    "GET /ws/tasks": "WebSocket for task updates",
    "GET /ws/products": "WebSocket for product updates",
    "GET /ws/posts": "WebSocket for post updates",
    "GET /ws/client/tasks": "Tasks WebSocket Playground",
    "GET /ws/client/products": "Products WebSocket Playground",
    "GET /ws/client/posts": "Posts WebSocket Playground",
    "GET /ws/stats": "WebSocket connection statistics",
    "GET /ws/health": "WebSocket health check",

    "GET /sse/tasks": "Server-Sent Events for task updates",
    "GET /sse/products": "Server-Sent Events for product updates",
    "GET /sse/posts": "Server-Sent Events for post updates",
    "GET /sse/client": "SSE Test Client Playground",
  };

  return descriptions[`${method} ${path}`] || `${method} ${path}`;
}

const ApiLandingPage: FC = () => {
  const styles = `
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: IBM Plex Serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
            padding: 40px 20px;
            position: relative;
          }

          .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }

          .header p {
            font-size: 1.2rem;
            opacity: 0.95;
          }

          .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 15px;
          }

          .visitor-counter {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;

            span:first-child {
              font-weight: 100;
            }
          }

          .visitor-counter .count {
            font-size: 1.2rem;
            font-weight: 700;
          }

          .visitor-counter .label {
            opacity: 0.9;
          }

          .visitor-counter.connected {
          }

          .visitor-counter.disconnected {
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
          }

          .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1);
          }

          .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }

          .card-icon {
            font-size: 2rem;
            /* margin-right: 12px; */
          }

          .card-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #1f2937;
          }

          .card-description {
            color: #6b7280;
            margin-bottom: 20px;
            line-height: 1.6;
          }

          .link-list {
            list-style: none;
          }

          .link-item {
            margin-bottom: 10px;
          }

          .link-item a {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            background: #f9fafb;
            border-radius: 6px;
            text-decoration: none;
            color: #4f46e5;
            font-weight: 500;
            transition: background 0.2s, color 0.2s;
            border: 1px solid #e5e7eb;
          }

          .link-item a:hover {
            background: #eef2ff;
            color: #4338ca;
            border-color: #c7d2fe;
          }

          .link-icon {
            margin-right: 8px;
            font-size: 1.1rem;
          }

          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-left: auto;
          }

          .badge-get { background: #dbeafe; color: #1e40af; }
          .badge-post { background: #dcfce7; color: #166534; }
          .badge-patch { background: #fef3c7; color: #92400e; }
          .badge-delete { background: #fee2e2; color: #991b1b; }
          .badge-all { background: #f3e8ff; color: #6b21a8; }
          .badge-ws { background: #f3e8ff; color: #6b21a8; }

          .footer {
            text-align: center;
            color: white;
            padding: 30px 20px;
            opacity: 0.9;
          }

          .footer a {
            color: white;
            text-decoration: underline;
          }

          @media (max-width: 768px) {
            .header h1 {
              font-size: 2rem;
            }
            .grid {
              grid-template-columns: 1fr;
            }
            .visitor-counter {
              position: static;
              margin-bottom: 20px;
              justify-content: center;
            }
          }
        `;

  const scripts = `
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws/visitors';

      let ws = null;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      const reconnectDelay = 2000;

      let visitorCounter = null;
      let visitorCount = null;

      function getElements() {
        visitorCounter = document.getElementById('visitor-counter');
        visitorCount = document.getElementById('visitor-count');
      }

      function updateVisitorCount(count) {
        // Ensure we have the latest element references
        if (!visitorCount) {
          getElements();
        }
        if (visitorCount) {
          visitorCount.textContent = count;
        } else {
          console.warn('visitor-count element not found');
        }
      }

      function setConnectionStatus(connected) {
        // Ensure we have the latest element references
        if (!visitorCounter) {
          getElements();
        }
        if (visitorCounter) {
          visitorCounter.classList.remove('connected', 'disconnected');
          visitorCounter.classList.add(connected ? 'connected' : 'disconnected');
        } else {
          console.warn('visitor-counter element not found');
        }
      }

      function connect() {
        try {
          ws = new WebSocket(wsUrl);

          ws.onopen = function() {
            reconnectAttempts = 0;
            setConnectionStatus(true);

            // Request initial visitor count
            ws.send(JSON.stringify({ type: 'request_count' }));
          };

          ws.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);

              if (data.type === 'visitor_count') {
                updateVisitorCount(data.count);
              }
            } catch (error) {
              console.error('[Visitor Counter] Error parsing message:', error);
            }
          };

          ws.onclose = function() {
            setConnectionStatus(false);
            updateVisitorCount('-');

            // Attempt to reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              setTimeout(connect, reconnectDelay);
            }
          };

          ws.onerror = function(error) {
            console.error('[Visitor Counter] WebSocket error:', error);
          };
        } catch (error) {
          console.error('[Visitor Counter] Error connecting:', error);
        }
      }

      // Connect when page loads
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          getElements();
          connect();
        });
      } else {
        getElements();
        connect();
      }

      // Clean up on page unload
      window.addEventListener('beforeunload', function() {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
  `;

  return (
    <Layout
      title="API Documentation - api.oluwasetemi.dev"
      styles={styles}
      scripts={scripts}
    >
      <div class="container">
        <div class="header">
          <div class="visitor-counter" id="visitor-counter">
            <span class="label">X</span>
            <span class="count" id="visitor-count"></span>
          </div>
          <h1>API Documentation</h1>
          <p>api.oluwasetemi.dev</p>
          <span class="status-badge"> 🟢 API Online</span>
        </div>

        <div class="grid">
          {/* Core Documentation */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon">📚</span>
              <h2 class="card-title">Core Documentation</h2>
            </div>
            <p class="card-description">
              OpenAPI documentation and interactive API reference
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/reference">
                  <span class="link-icon">📖</span>
                  OpenAPI Reference
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/doc">
                  <span class="link-icon">📄</span>
                  OpenAPI JSON
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/api/auth/docs">
                  <span class="link-icon">🔐</span>
                  Better Auth Docs
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/health">
                  <span class="link-icon">💚</span>
                  Health Check
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Dynamically render API routes */}
          {Object.entries(apiRoutes).map(([category, routes]) => {
            // Category metadata
            const categoryMeta: Record<string, { icon: string; title: string; description: string }> = {
              tasks: {
                icon: "",
                title: "Tasks API",
                description: "Task management with hierarchical relationships and real-time updates",
              },
              products: {
                icon: "",
                title: "Products API",
                description: "E-commerce product management with pricing and inventory",
              },
              posts: {
                icon: "",
                title: "Posts API",
                description: "Blog posts and content management with auto-generated slugs",
              },
              auth: {
                icon: "",
                title: "Authentication",
                description: "JWT-based and Better Auth authentication systems",
              },
              webhooks: {
                icon: "",
                title: "Webhooks",
                description: "Outgoing webhooks with retry logic and incoming webhook receivers",
              },
              graphql: {
                icon: "",
                title: "GraphQL",
                description: "GraphQL API with subscriptions and auto-generated schema",
              },
              analytics: {
                icon: "",
                title: "Analytics",
                description: "Request analytics and usage statistics",
              },
              websocket: {
                icon: "",
                title: "WebSocket",
                description: "Real-time bidirectional communication for tasks, products, and posts",
              },
              sse: {
                icon: "",
                title: "Server-Sent Events (SSE)",
                description: "One-way real-time event streaming from server to client with automatic reconnection",
              },
            };

            const meta = categoryMeta[category];
            if (!meta || category === "root")
              return null;

            return (
              <div class="card" key={category}>
                <div class="card-header">
                  <span class="card-icon">{meta.icon}</span>
                  <h2 class="card-title">{meta.title}</h2>
                </div>
                <p class="card-description">{meta.description}</p>
                <ul class="link-list">
                  {routes.map((route) => {
                    const badgeClass = `badge-${route.method.toLowerCase()}`;
                    const description = getRouteDescription(route.path, route.method);

                    return (
                      <li class="link-item" key={`${route.method}-${route.path}`}>
                        <a href={route.docsUrl} target="_blank" rel="noopener noreferrer">
                          <span class="link-icon">→</span>
                          {description}
                          <span class={`badge ${badgeClass}`}>{route.method}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div class="footer">
          <p>Built with Hono, Drizzle ORM, and TypeScript</p>
          <p>
            <a href="https://github.com/Oluwasetemi/api.oluwasetemi.dev" target="_blank" rel="noreferrer noopener">
              View on GitHub →
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

// Route handler
app.get("/", (c) => {
  return c.html(<ApiLandingPage />);
});

export default app;