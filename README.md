# OLUWASETEMI API

Think of this as a personal api repository.

- [OLUWASETEMI API](#api.oluwasetemi.dev)
  - [Included](#included)
  - [Security & Reliability](#security--reliability)
  - [Setup](#setup)
  - [Code Tour](#code-tour)
  - [Endpoints](#endpoints)
  - [Pagination](#pagination)
  - [References](#references)

## Included

- Structured logging with [pino](https://getpino.io/) / [hono-pino](https://www.npmjs.com/package/hono-pino)
- Documented / type-safe routes with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- Interactive API documentation with [scalar](https://scalar.com/#api-docs) / [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)
- **JWT Authentication** with access/refresh tokens, password validation, and user management
- **Better Auth Integration** with modern session management and security features
- **Real-time WebSocket Support** with channel-based messaging for tasks, products, and posts
- **GraphQL Subscriptions** with WebSocket transport for real-time data updates
- **Webhook System** with retry logic, signature verification, and event tracking
- **Reusable Layout Component** for consistent JSX page rendering
- **Products & Posts APIs** with full CRUD operations and real-time updates
- Convenience methods / helpers to reduce boilerplate with [stoker](https://www.npmjs.com/package/stoker)
- Type-safe schemas and environment variables with [zod](https://zod.dev/)
- Single source of truth database schemas with [drizzle](https://orm.drizzle.team/docs/overview) and [drizzle-zod](https://orm.drizzle.team/docs/zod)
- Testing with [vitest](https://vitest.dev/)
- GraphQL endpoint powered by [drizzle-graphql](https://github.com/drizzle-team/drizzle-graphql) and [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- Sensible editor, formatting, and linting settings with [@antfu/eslint-config](https://github.com/antfu/eslint-config)

## Security & Reliability

This API includes comprehensive security measures and reliability improvements:

### 🔐 JWT Authentication System

- **Complete authentication flow**: User registration, login, token refresh, and protected routes
- **Secure password requirements**: Enforced complexity with uppercase, lowercase, digits, and special characters
- **Dual token strategy**: Short-lived access tokens (24h) and long-lived refresh tokens (7d)
- **Password security**: bcrypt hashing with environment-specific rounds (dev: 6, prod: 12)
- **User management**: Email normalization, duplicate prevention, account activation, and last login tracking
- **Multi-platform support**: Both REST API and GraphQL authentication endpoints
- **Better Auth integration**: Modern authentication library with built-in endpoints and session management

### 🔒 Rate Limiting & Security

- **Multi-runtime IP extraction**: Robust client IP detection across Node.js, Cloudflare Workers, Deno, and Bun environments
- **Proxy chain validation**: Only trusts proxy headers when requests come from configured trusted proxies
- **Header spoofing prevention**: Validates proxy chains to prevent rate limit bypass attacks
- **Environment-aware rate limiting**: Different limits for API, auth, GraphQL, and public endpoints
- **Graceful error handling**: Rate limiter continues working even when IP extraction fails

### 🛡️ Security Headers

- **Automatic HTTP header formatting**: Converts camelCase to proper Title-Case headers (e.g., `contentSecurityPolicy` → `Content-Security-Policy`)
- **Environment-specific policies**: Stricter security in production, development-friendly settings locally
- **Comprehensive security coverage**: CSP, CORS, HSTS, frame protection, and content type validation

### 📊 Enhanced GraphQL

- **Authentication integration**: Complete GraphQL auth mutations and queries (`register`, `login`, `refreshToken`, `me`)
- **Real-time subscriptions**: WebSocket-based subscriptions for tasks, products, and posts with event-driven updates
- **Custom queries and mutations**: Extended auto-generated schema with custom resolvers
- **Analytics integration**: GraphQL endpoint for `countRequests` with filtering and grouping
- **Type-safe operations**: Full TypeScript support with proper error handling
- **Development playground**: Interactive GraphQL playground in development mode
- **Subscription testing**: Built-in subscription tester for real-time event validation

### 🧪 Robust Testing

- **Isolated test databases**: Each test gets a unique database to prevent conflicts
- **Comprehensive cleanup**: Automatic cleanup of test data and database files
- **Multi-environment support**: Tests work across different runtime environments
- **Analytics testing**: Full test coverage for request logging and aggregation
- **Better Auth testing**: Complete test suite for Better Auth endpoints with authentication flows
- **Improved coverage**: Enhanced test coverage with unit, integration, and error handling tests

### 🔧 Environment Variables

Additional security and authentication-related environment variables:

| Variable                     | Description                               | Default  | Required |
| ---------------------------- | ----------------------------------------- | -------- | -------- |
| `JWT_SECRET`                 | Secret key for JWT access token signing   | -        | Yes      |
| `JWT_REFRESH_SECRET`         | Secret key for JWT refresh token signing  | -        | Yes      |
| `JWT_EXPIRES_IN`             | Access token expiration time              | `24h`    | No       |
| `JWT_REFRESH_EXPIRES_IN`     | Refresh token expiration time             | `7d`     | No       |
| `BETTER_AUTH_URL`            | Better Auth base URL                      | -        | Yes      |
| `BETTER_AUTH_SECRET`         | Better Auth secret key (min 32 chars)     | -        | Yes      |
| `RESEND_API_KEY`             | Resend API key for email functionality    | -        | Yes      |
| `RATE_LIMIT_ENABLED`         | Enable/disable rate limiting              | `true`   | No       |
| `RATE_LIMIT_WINDOW_MS`       | Rate limit window in milliseconds         | `900000` | No       |
| `RATE_LIMIT_MAX_REQUESTS`    | Max requests per window                   | `100`    | No       |
| `RATE_LIMIT_TRUST_PROXY`     | Trust proxy headers for IP extraction     | `false`  | No       |
| `RATE_LIMIT_TRUSTED_PROXIES` | Comma-separated list of trusted proxy IPs | -        | No       |

### 🔌 Real-time WebSocket System

- **Channel-based messaging**: Organized WebSocket channels for tasks, products, and posts
- **Connection management**: Automatic connection tracking, user association, and cleanup
- **Event broadcasting**: Real-time notifications for CRUD operations across all entities
- **Interactive test clients**: Built-in WebSocket test clients for each channel type
- **Connection statistics**: Real-time monitoring of active connections and message counts
- **Authentication support**: Optional user authentication for WebSocket connections

### 🪝 Advanced Webhook System

- **Outgoing webhooks**: Configurable webhook subscriptions with retry logic and exponential backoff
- **Signature verification**: HMAC-SHA256 signature generation and validation for webhook security
- **Event tracking**: Complete webhook event history with delivery status and retry attempts
- **Incoming webhook receivers**: Ready-to-use endpoints for GitHub, Stripe, and custom webhooks
- **Retry mechanisms**: Configurable retry strategies (linear and exponential backoff)
- **Webhook testing**: Built-in webhook testing and validation tools

### 🚀 Performance & Reliability

- **Non-blocking analytics**: Request logging doesn't impact response times
- **Efficient database operations**: Optimized queries with proper indexing
- **Memory-safe operations**: Proper cleanup and resource management
- **Cross-platform compatibility**: Works reliably across different deployment environments
- **Real-time efficiency**: Optimized WebSocket message handling and connection management

## Setup

Clone this template without the git history

```sh
npx degit Oluwasetemi/hono-open-api-starter my-api
cd my-api
```

Create `.env` file

```sh
cp .env.example .env
```

Install dependencies

```sh
pnpm install
```

Create sqlite db / push schema

```sh
pnpm drizzle-kit push
```

Run

```sh
pnpm dev
```

Lint

```sh
pnpm lint
```

Test

```sh
pnpm test
```

### Environment Variables

The following environment variables are supported:

| Variable                              | Description                                  | Default       | Required        |
| ------------------------------------- | -------------------------------------------- | ------------- | --------------- |
| `NODE_ENV`                            | Environment mode                             | `development` | No              |
| `PORT`                                | Server port                                  | `4444`        | No              |
| `LOG_LEVEL`                           | Logging level                                | `info`        | Yes             |
| `DATABASE_URL`                        | Database connection string                   | -             | Yes             |
| `DATABASE_AUTH_TOKEN`                 | Database auth token (required in production) | -             | Production only |
| `ENABLE_ANALYTICS`                    | Enable request analytics logging             | `false`       | No              |
| `ANALYTICS_RETENTION_DAYS`            | Days to retain analytics data                | `30`          | No              |
| **Rate Limiting**                     |                                              |               |                 |
| `RATE_LIMIT_ENABLED`                  | Enable/disable rate limiting                 | `true`        | No              |
| `RATE_LIMIT_WINDOW_MS`                | Rate limit window in milliseconds            | `900000`      | No              |
| `RATE_LIMIT_MAX_REQUESTS`             | Max requests per window                      | `100`         | No              |
| `RATE_LIMIT_TRUST_PROXY`              | Trust proxy headers for IP extraction        | `false`       | No              |
| `RATE_LIMIT_TRUSTED_PROXIES`          | Comma-separated list of trusted proxy IPs    | -             | No              |
| `RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS` | Skip counting successful requests (2xx, 3xx) | `false`       | No              |
| `RATE_LIMIT_SKIP_FAILED_REQUESTS`     | Skip counting failed requests (4xx, 5xx)     | `false`       | No              |
| **JWT Authentication**                |                                              |               |                 |
| `JWT_SECRET`                          | Secret key for JWT access token signing      | -             | Yes             |
| `JWT_REFRESH_SECRET`                  | Secret key for JWT refresh token signing     | -             | Yes             |
| `JWT_EXPIRES_IN`                      | Access token expiration time                 | `24h`         | No              |
| `JWT_REFRESH_EXPIRES_IN`              | Refresh token expiration time                | `7d`          | No              |
| **Better Auth**                       |                                              |               |                 |
| `BETTER_AUTH_URL`                     | Better Auth base URL                         | -             | Yes             |
| `BETTER_AUTH_SECRET`                  | Better Auth secret key (min 32 chars)        | -             | Yes             |
| `RESEND_API_KEY`                      | Resend API key for email functionality       | -             | Yes             |

### Analytics Configuration

To enable request analytics, set `ENABLE_ANALYTICS=true` in your `.env` file. When enabled, the API will log all incoming requests to the database, including:

- HTTP method and path
- Response status code
- Request duration
- User agent and IP address
- Timestamp

Analytics data is automatically cleaned up after the retention period specified by `ANALYTICS_RETENTION_DAYS`.

#### Opt-out

To disable analytics completely, set `ENABLE_ANALYTICS=false` or omit the variable from your environment.

### Better Auth Configuration

Better Auth provides modern authentication with built-in session management and security features:

- **BETTER_AUTH_URL**: The base URL for your application (e.g., `http://localhost:4444`)
- **BETTER_AUTH_SECRET**: A secure secret key (minimum 32 characters) used for session encryption and signing
- **RESEND_API_KEY**: API key for Resend email service, used for password reset emails and other transactional emails

Better Auth automatically handles:

- Session management with secure cookies
- Password reset workflows
- User profile updates
- Authentication state management

Live Documentation for better-auth: [https://api.oluwasetemi.dev/api/auth/docs](https://api.oluwasetemi.dev/api/auth/docs)

## Code Tour

Base hono app exported from [app.ts](./src/app.ts). Local development uses [@hono/node-server](https://hono.dev/docs/getting-started/nodejs) defined in [index.ts](./src/index.ts) - update this file or create a new entry point to use your preferred runtime.

Typesafe env defined in [env.ts](./src/env.ts) - add any other required environment variables here. The application will not start if any required environment variables are missing.

See [src/routes/tasks](./src/routes/tasks/) for an example of an Open API group. Copy this folder / use it as an example for your route groups.

- Router created in [tasks.index.ts](./src/routes/tasks/tasks.index.ts)
- Route definitions are defined in [tasks.routes.ts](./src/routes/tasks/tasks.routes.ts)
- Hono request handlers (controllers) defined in [tasks.handlers.ts](./src/routes/tasks/tasks.handlers.ts)
- Group unit tests defined in [tasks.test.ts](./src/routes/tasks/tasks.test.ts)

All app routes are grouped together and exported into a single type as `AppType` in [app.ts](./src/app.ts) for use in [RPC / hono/client](https://hono.dev/docs/guides/rpc). This is extremely useful.

## Endpoints

### Authentication Endpoints

#### Legacy JWT Authentication

| Path                | Description                                |
| ------------------- | ------------------------------------------ |
| POST /auth/register | Register a new user account                |
| POST /auth/login    | Login with email and password              |
| POST /auth/refresh  | Refresh access token using refresh token   |
| GET /auth/me        | Get current authenticated user (protected) |

#### Better Auth Endpoints

| Path                           | Description                      |
| ------------------------------ | -------------------------------- |
| POST /api/auth/sign-up/email   | Register with email and password |
| POST /api/auth/sign-in/email   | Login with email and password    |
| POST /api/auth/sign-out        | Sign out and clear session       |
| GET /api/auth/get-session      | Get current session information  |
| POST /api/auth/update-user     | Update user profile (protected)  |
| POST /api/auth/change-password | Change user password (protected) |
| POST /api/auth/forget-password | Request password reset email     |
| GET /api/auth/reference        | Better Auth API reference        |

### Core API Endpoints

| Path           | Description                    |
| -------------- | ------------------------------ |
| GET /doc       | Open API Specification         |
| GET /reference | Scalar API Documentation       |
| GET /          | API Documentation Landing Page |

### Tasks API

| Path                     | Description        |
| ------------------------ | ------------------ |
| GET /tasks               | List all tasks     |
| POST /tasks              | Create a task      |
| GET /tasks/{id}          | Get one task by id |
| GET /tasks/{id}/children | Get task children  |
| PATCH /tasks/{id}        | Update a task      |
| DELETE /tasks/{id}       | Delete a task      |

### Products API

| Path                  | Description           |
| --------------------- | --------------------- |
| GET /products         | List all products     |
| POST /products        | Create a product      |
| GET /products/{id}    | Get one product by id |
| PATCH /products/{id}  | Update a product      |
| DELETE /products/{id} | Delete a product      |

### Posts API

| Path                   | Description        |
| ---------------------- | ------------------ |
| GET /posts             | List all posts     |
| POST /posts            | Create a post      |
| GET /posts/{id}        | Get one post by id |
| GET /posts/slug/{slug} | Get post by slug   |
| PATCH /posts/{id}      | Update a post      |
| DELETE /posts/{id}     | Delete a post      |

### WebSocket Endpoints

| Path                    | Description                    |
| ----------------------- | ------------------------------ |
| WS /ws/tasks            | WebSocket channel for tasks    |
| WS /ws/products         | WebSocket channel for products |
| WS /ws/posts            | WebSocket channel for posts    |
| GET /ws/client          | Tasks WebSocket test client    |
| GET /ws/client/products | Products WebSocket test client |
| GET /ws/client/posts    | Posts WebSocket test client    |
| GET /ws/stats           | WebSocket connection stats     |
| GET /ws/health          | WebSocket health check         |

### Webhook Endpoints

| Path                             | Description                 |
| -------------------------------- | --------------------------- |
| GET /webhooks/subscriptions      | List webhook subscriptions  |
| POST /webhooks/subscriptions     | Create webhook subscription |
| GET /webhooks/events             | List webhook events         |
| POST /webhooks/events/{id}/retry | Retry webhook event         |
| POST /webhooks/github            | GitHub webhook receiver     |
| POST /webhooks/stripe            | Stripe webhook receiver     |
| POST /webhooks/test              | Test webhook endpoint       |

### GraphQL & Analytics

| Path                     | Description                     |
| ------------------------ | ------------------------------- |
| POST /graphql            | GraphQL endpoint                |
| WS /graphql              | GraphQL WebSocket subscriptions |
| GET /playground          | GraphQL Playground (dev only)   |
| GET /subscription-tester | GraphQL subscription tester     |
| GET /analytics/requests  | List request analytics          |
| GET /analytics/summary   | Get analytics summary           |

The `/graphql` endpoint exposes the existing database schema via GraphQL so you can query and mutate tasks using standard GraphQL syntax.

Use Altair GraphQL to run in production or any graphql playground. - [https://api.oluwasetemi.dev/graphql](https://api.oluwasetemi.dev/graphql)

Live Documentation for whole API: [https://api.oluwasetemi.dev/reference](https://api.oluwasetemi.dev/reference)

### GraphQL Features

- **Auto-generated schema**: Database tables are automatically exposed as GraphQL types
- **Authentication support**: Complete auth mutations (`register`, `login`, `refreshToken`) and queries (`me`)
- **Real-time subscriptions**: WebSocket-based subscriptions for real-time data updates
- **Custom queries**: Additional queries like `countRequests` for analytics with filtering and grouping
- **Type safety**: Full TypeScript integration with proper type checking
- **Development playground**: Interactive GraphQL playground available at `/playground` in development mode
- **Subscription testing**: Built-in subscription tester for validating real-time events

### GraphQL Authentication

The GraphQL endpoint includes comprehensive authentication support:

#### Mutations

**register**: Create a new user account

```graphql
mutation RegisterUser($email: String!, $password: String!, $name: String, $imageUrl: String) {
  register(email: $email, password: $password, name: $name, imageUrl: $imageUrl) {
    user {
      id
      email
      name
      imageUrl
      isActive
      createdAt
      updatedAt
    }
    accessToken
    refreshToken
  }
}
```

**login**: Authenticate with email and password

```graphql
mutation LoginUser($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    user {
      id
      email
      name
      imageUrl
      lastLoginAt
    }
    accessToken
    refreshToken
  }
}
```

**refreshToken**: Get new tokens using refresh token

```graphql
mutation RefreshTokens($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    accessToken
    refreshToken
  }
}
```

#### Queries

**me**: Get current authenticated user (requires Authorization header)

```graphql
query GetCurrentUser {
  me {
    id
    email
    name
    imageUrl
    isActive
    lastLoginAt
    createdAt
    updatedAt
  }
}
```

To use protected queries, include the JWT token in the Authorization header:

```
Authorization: Bearer your-jwt-token-here
```

#### Real-time Subscriptions

The GraphQL endpoint supports real-time subscriptions via WebSocket for tasks, products, and posts:

**Task Subscriptions:**

```graphql
subscription {
  taskCreated {
    id
    name
    description
    status
    priority
    createdAt
  }
}

subscription {
  taskUpdated {
    id
    name
    status
    priority
    updatedAt
  }
}

subscription {
  taskDeleted {
    id
  }
}
```

**Product Subscriptions:**

```graphql
subscription {
  productCreated {
    id
    name
    description
    price
    sku
    createdAt
  }
}

subscription {
  productUpdated {
    id
    name
    description
    price
    sku
    createdAt
    updatedAt
  }
}

subscription {
  productDeleted {
    id
  }
}
```

**Post Subscriptions:**

```graphql
subscription {
  postCreated {
    id
    title
    slug
    content
    status
    createdAt
  }
}

subscription {
  postUpdated {
    id
    title
    slug
    content
    status
    updatedAt
  }
}

subscription {
  postDeleted {
    id
  }
}

subscription {
  postPublished {
    id
    title
    slug
    status
    createdAt
  }
}
```

**WebSocket Connection:**

To use subscriptions, connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket("ws://localhost:4444/graphql");

// Send connection init
ws.send(JSON.stringify({
  type: "connection_init",
  payload: {
    Authorization: "Bearer your-jwt-token-here"
  }
}));

// Subscribe to events
ws.send(JSON.stringify({
  type: "subscribe",
  id: "1",
  payload: {
    query: "subscription { taskCreated { id name status } }"
  }
}));
```

#### Custom Queries

**countRequests**: Get request analytics with optional filtering and grouping

```graphql
query {
  countRequests(
    from: "2024-01-01T00:00:00Z"
    to: "2024-12-31T23:59:59Z"
    groupBy: "day"
    method: "GET"
    path: "/api/tasks"
  ) {
    total
    data {
      key
      count
    }
    groupedBy
  }
}
```

### Analytics Endpoints

The analytics endpoints provide insights into API usage when `ENABLE_ANALYTICS=true`:

#### GET /analytics/requests

Returns paginated list of all logged requests.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page
- `method` (string, optional) - Filter by HTTP method
- `path` (string, optional) - Filter by request path
- `status` (number, optional) - Filter by status code
- `from` (datetime, optional) - Filter requests from this date
- `to` (datetime, optional) - Filter requests to this date

**Example:**

```bash
http :4444/analytics/requests page==1 limit==20 method==GET
```

#### GET /analytics/counts

Returns aggregated request counts and statistics.

**Query Parameters:**

- `from` (datetime, optional) - Count requests from this date
- `to` (datetime, optional) - Count requests to this date
- `path` (string, optional) - Filter by request path
- `method` (string, optional) - Filter by HTTP method
- `groupBy` (enum: "day", "path", "method", optional) - Group results by field

**Examples:**

I love [HTTPie](https://httpie.io/). Its easier to learn compared to `curl`.

```bash
# Get total request count
http :4444/analytics/counts

# Get requests grouped by day
http :4444/analytics/counts groupBy==day

# Get requests grouped by path
http :4444/analytics/counts groupBy==path

# Get requests grouped by method
http :4444/analytics/counts groupBy==method
```

### WebSocket Usage

The API provides real-time WebSocket channels for tasks, products, and posts. Each channel broadcasts events when entities are created, updated, or deleted.

**Connecting to WebSocket Channels:**

```javascript
// Tasks channel
const tasksWS = new WebSocket("ws://localhost:4444/ws/tasks");

// Products channel
const productsWS = new WebSocket("ws://localhost:4444/ws/products");

// Posts channel
const postsWS = new WebSocket("ws://localhost:4444/ws/posts");
```

**Message Format:**

```javascript
// Subscribe to specific entity
ws.send(JSON.stringify({
  type: "subscribe",
  taskId: "task-uuid-here"
}));

// Unsubscribe from entity
ws.send(JSON.stringify({
  type: "unsubscribe",
  taskId: "task-uuid-here"
}));
```

**Event Messages:**

```json
// Received when entity is created/updated/deleted
{
  "type": "task_created", // or task_updated, task_deleted
  "data": {
    "id": "uuid",
    "name": "Task name"
    // ... other task fields
  }
}
```

### Webhook System

The webhook system allows you to receive real-time notifications when entities are created, updated, or deleted.

**Creating a Webhook Subscription:**

```bash
http POST :4444/webhooks/subscriptions \
  url="https://your-app.com/webhook" \
  events:='["task.created", "task.updated", "task.deleted"]' \
  secret="your-webhook-secret" \
  retryPolicy:='{"maxAttempts": 5, "backoff": "exponential"}'
```

**Webhook Payload:**

```json
{
  "id": "webhook-event-uuid",
  "event": "task.created",
  "data": {
    "id": "task-uuid",
    "name": "Task name",
    "status": "pending"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "attempt": 1
}
```

**Signature Verification:**

```javascript
const crypto = require("node:crypto");

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}
```

### Incoming Webhook Receivers

The API provides dedicated endpoints for receiving webhooks from external services with automatic logging and idempotency handling.

**Generic Webhook Receiver:**

```bash
# Send webhook to any provider
http POST :4444/webhooks/incoming/github \
  X-Webhook-Id:="unique-event-id" \
  X-Webhook-Event:="push" \
  X-Webhook-Signature:="sha256=signature" \
  body:='{"event": "data"}'
```

**GitHub Webhook Receiver:**

```bash
# GitHub webhook (automatically extracts GitHub headers)
http POST :4444/webhooks/github \
  X-Hub-Signature-256:="sha256=signature" \
  X-GitHub-Delivery:="unique-delivery-id" \
  X-GitHub-Event:="push" \
  body:='{"ref": "refs/heads/main", "commits": []}'
```

**Stripe Webhook Receiver:**

```bash
# Stripe webhook (automatically extracts event ID and type from payload)
http POST :4444/webhooks/stripe \
  Stripe-Signature:="t=timestamp,v1=signature" \
  body:='{"id": "evt_123", "type": "payment_intent.succeeded", "data": {}}'
```

**Webhook Response:**

All incoming webhooks return a consistent response format:

```json
{
  "success": true,
  "message": "Webhook received",
  "id": "webhook-log-uuid"
}
```

**Features:**

- **Automatic logging**: All incoming webhooks are stored in the database with full payload and headers
- **Idempotency**: Duplicate events are detected and skipped using event IDs
- **Provider-specific handling**: Automatic extraction of event metadata based on provider
- **Signature storage**: Webhook signatures are preserved for later verification
- **Event tracking**: Each webhook is assigned a unique ID for tracking and debugging

**Supported Providers:**

| Provider | Endpoint                        | Event ID Source     | Event Type Source | Signature Header      |
| -------- | ------------------------------- | ------------------- | ----------------- | --------------------- |
| GitHub   | `/webhooks/github`              | `X-GitHub-Delivery` | `X-GitHub-Event`  | `X-Hub-Signature-256` |
| Stripe   | `/webhooks/stripe`              | `payload.id`        | `payload.type`    | `Stripe-Signature`    |
| Generic  | `/webhooks/incoming/{provider}` | `X-Webhook-Id`      | `X-Webhook-Event` | `X-Webhook-Signature` |

**Webhook Log Schema:**

```json
{
  "id": "uuid",
  "provider": "github|stripe|custom",
  "eventId": "unique-event-identifier",
  "eventType": "event.type",
  "payload": "raw-webhook-body",
  "signature": "webhook-signature",
  "verified": false,
  "processed": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Performance Considerations

- Analytics logging adds minimal overhead (~1-2ms per request)
- Database writes are non-blocking and don't affect response times
- WebSocket connections are efficiently managed with automatic cleanup
- Webhook delivery uses exponential backoff to prevent overwhelming endpoints
- Consider the retention period based on your storage capacity
- For high-traffic applications, consider using a separate analytics database
- The analytics middleware can be disabled per-route if needed

## Pagination

The `tasks` endpoint is paginated by default and you can opt out of the pagination by enabling `all=true` flag. The pagination structure looks like the following:

```js
const requestsResponseSchema = z.object({
  data: z.array(selectRequestsSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});
```

The key is a `data` - contains the original data and `meta` - contains the data about the pagination.

## References

- [What is Open API?](https://swagger.io/docs/specification/v3_0/about/)
- [Hono](https://hono.dev/)
  - [Zod OpenAPI Example](https://hono.dev/examples/zod-openapi)
  - [Testing](https://hono.dev/docs/guides/testing)
  - [Testing Helper](https://hono.dev/docs/helpers/testing)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Scalar Documentation](https://github.com/scalar/scalar/tree/main/?tab=readme-ov-file#documentation)
  - [Themes / Layout](https://github.com/scalar/scalar/blob/main/documentation/themes.md)
  - [Configuration](https://github.com/scalar/scalar/blob/main/documentation/configuration.md)
