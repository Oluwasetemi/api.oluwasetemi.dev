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

| Path               | Description              |
| ------------------ | ------------------------ |
| GET /doc           | Open API Specification   |
| GET /reference     | Scalar API Documentation |
| GET /tasks         | List all tasks           |
| POST /tasks        | Create a task            |
| GET /tasks/{id}    | Get one task by id       |
| GET /tasks/{id}/Children    | Get one task by id      |
| PATCH /tasks/{id}  | Patch one task by id     |
| DELETE /tasks/{id} | Delete one task by id    |

## Pagination



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
