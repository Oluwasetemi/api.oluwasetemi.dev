import type { FC } from "hono/jsx";

import { createRouter } from "@/lib/create-app";
import { Layout } from "@/lib/layout";

const app = createRouter();

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
          }
        `;

  return (
    <Layout
      title="API Documentation - api.oluwasetemi.dev"
      styles={styles}
    >
      <div class="container">
        <div class="header">
          <h1>API Documentation</h1>
          <p>api.oluwasetemi.dev</p>
          <span class="status-badge"> 🟢 API Online</span>
        </div>

        <div class="grid">
          {/* Core Documentation */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Core Documentation</h2>
            </div>
            <p class="card-description">
              OpenAPI documentation and interactive API reference
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/reference">
                  <span class="link-icon"></span>
                  OpenAPI Reference
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/doc">
                  <span class="link-icon"></span>
                  OpenAPI JSON
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/api/auth/docs">
                  <span class="link-icon"></span>
                  Better Auth Docs
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/health">
                  <span class="link-icon"></span>
                  Health Check
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Tasks API */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Tasks API</h2>
            </div>
            <p class="card-description">
              Task management with hierarchical relationships and real-time updates
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/tasks">
                  <span class="link-icon"></span>
                  List Tasks
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/tasks" onclick="event.preventDefault(); alert('POST /tasks with JSON body')">
                  <span class="link-icon"></span>
                  Create Task
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Products API */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Products API</h2>
            </div>
            <p class="card-description">
              E-commerce product management with pricing and inventory
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/products">
                  <span class="link-icon"></span>
                  List Products
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/products" onclick="event.preventDefault(); alert('POST /products with JSON body')">
                  <span class="link-icon"></span>
                  Create Product
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Posts API */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Posts API</h2>
            </div>
            <p class="card-description">
              Blog posts and content management with publishing workflow
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/posts">
                  <span class="link-icon"></span>
                  List Posts
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/posts" onclick="event.preventDefault(); alert('POST /posts with JSON body')">
                  <span class="link-icon"></span>
                  Create Post
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Authentication */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Authentication</h2>
            </div>
            <p class="card-description">
              JWT-based and Better Auth authentication systems
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/auth/register" onclick="event.preventDefault(); alert('POST /auth/register with email & password')">
                  <span class="link-icon"></span>
                  Register (JWT)
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/auth/login" onclick="event.preventDefault(); alert('POST /auth/login with credentials')">
                  <span class="link-icon"></span>
                  Login (JWT)
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/api/auth/docs">
                  <span class="link-icon"></span>
                  Better Auth Docs
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Webhooks */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Webhooks</h2>
            </div>
            <p class="card-description">
              Outgoing webhooks with retry logic and incoming webhook receivers
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/webhooks/subscriptions">
                  <span class="link-icon"></span>
                  Subscriptions
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/webhooks/events">
                  <span class="link-icon"></span>
                  Event History
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/webhooks/github" onclick="event.preventDefault(); alert('POST endpoint for receiving GitHub webhooks')">
                  <span class="link-icon"></span>
                  GitHub Receiver
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/webhooks/stripe" onclick="event.preventDefault(); alert('POST endpoint for receiving Stripe webhooks')">
                  <span class="link-icon"></span>
                  Stripe Receiver
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
            </ul>
          </div>

          {/* WebSocket */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">WebSocket</h2>
            </div>
            <p class="card-description">
              Real-time bidirectional communication for tasks, products, and posts
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/ws/client/tasks">
                  <span class="link-icon"></span>
                  Tasks Client
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/ws/client/products">
                  <span class="link-icon"></span>
                  Products Client
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/ws/client/posts">
                  <span class="link-icon"></span>
                  Posts Client
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/ws/stats">
                  <span class="link-icon"></span>
                  Connection Stats
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/ws/health">
                  <span class="link-icon"></span>
                  WebSocket Health
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
            </ul>
          </div>

          {/* GraphQL */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">GraphQL</h2>
            </div>
            <p class="card-description">
              GraphQL API with subscriptions and auto-generated schema
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/graphql" onclick="event.preventDefault(); alert('POST /graphql with GraphQL query')">
                  <span class="link-icon"></span>
                  GraphQL Endpoint
                  <span class="badge badge-post">POST</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/playground">
                  <span class="link-icon"></span>
                  GraphQL Playground
                  <span class="badge badge-get">VIEW</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/subscription-tester">
                  <span class="link-icon"></span>
                  Subscription Tester
                  <span class="badge badge-ws">TEST</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Analytics */}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"></span>
              <h2 class="card-title">Analytics</h2>
            </div>
            <p class="card-description">
              Request analytics and usage statistics
            </p>
            <ul class="link-list">
              <li class="link-item">
                <a href="/analytics/requests">
                  <span class="link-icon"></span>
                  Request Stats
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
              <li class="link-item">
                <a href="/analytics/summary">
                  <span class="link-icon"></span>
                  Summary
                  <span class="badge badge-get">GET</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>Built with Hono, Drizzle ORM, and TypeScript</p>
          <p>
            <a href="https://github.com/Oluwasetemi/api.oluwasetemi.dev" target="_blank">
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
