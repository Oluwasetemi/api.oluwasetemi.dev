# OLUWASETEMI API

Think of this as a personal api repository.

- [OLUWASETEMI API](#api.oluwasetemi.dev)
  - [Included](#included)
  - [Setup](#setup)
  - [Code Tour](#code-tour)
  - [Endpoints](#endpoints)
  - [Pagination](#pagination)
  - [References](#references)

## Included

- Structured logging with [pino](https://getpino.io/) / [hono-pino](https://www.npmjs.com/package/hono-pino)
- Documented / type-safe routes with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- Interactive API documentation with [scalar](https://scalar.com/#api-docs) / [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)
- Convenience methods / helpers to reduce boilerplate with [stoker](https://www.npmjs.com/package/stoker)
- Type-safe schemas and environment variables with [zod](https://zod.dev/)
- Single source of truth database schemas with [drizzle](https://orm.drizzle.team/docs/overview) and [drizzle-zod](https://orm.drizzle.team/docs/zod)
- Testing with [vitest](https://vitest.dev/)
- GraphQL endpoint powered by [drizzle-graphql](https://github.com/drizzle-team/drizzle-graphql) and [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- Sensible editor, formatting, and linting settings with [@antfu/eslint-config](https://github.com/antfu/eslint-config)

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

| Variable                   | Description                                  | Default       | Required        |
| -------------------------- | -------------------------------------------- | ------------- | --------------- |
| `NODE_ENV`                 | Environment mode                             | `development` | No              |
| `PORT`                     | Server port                                  | `4444`        | No              |
| `LOG_LEVEL`                | Logging level                                | `info`        | Yes             |
| `DATABASE_URL`             | Database connection string                   | -             | Yes             |
| `DATABASE_AUTH_TOKEN`      | Database auth token (required in production) | -             | Production only |
| `ENABLE_ANALYTICS`         | Enable request analytics logging             | `false`       | No              |
| `ANALYTICS_RETENTION_DAYS` | Days to retain analytics data                | `30`          | No              |

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

| Path                     | Description              |
| ------------------------ | ------------------------ |
| GET /doc                 | Open API Specification   |
| GET /reference           | Scalar API Documentation |
| GET /tasks               | List all tasks           |
| POST /tasks              | Create a task            |
| GET /tasks/{id}          | Get one task by id       |
| GET /tasks/{id}/Children | Get one task by id       |
| PATCH /tasks/{id}        | Patch one task by id     |
| DELETE /tasks/{id}       | Delete one task by id    |
| GET /graphql             | GraphQL endpoint         |
| GET /analytics/requests  | List request analytics   |
| GET /analytics/counts    | Get aggregated analytics |

The `/graphql` endpoint exposes the existing database schema via GraphQL so you can query and mutate tasks using standard GraphQL syntax.

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

### Performance Considerations

- Analytics logging adds minimal overhead (~1-2ms per request)
- Database writes are non-blocking and don't affect response times
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
