# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (TypeScript compilation + alias resolution)
- `pnpm start` - Run production build
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix auto-fixable ESLint issues
- `pnpm test` - Run tests with Vitest

### Database Commands

- `pnpm seed` - Seed database with sample data
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Apply database migrations
- `pnpm db:studio` - Open Drizzle Studio for database management

### Single Test Execution

Use `pnpm test` with file patterns:

- `pnpm test tasks.test.ts` - Run specific test file
- `pnpm test --reporter=verbose` - Run with detailed output

## Architecture Overview

### Application Structure

This is a Hono-based REST API with OpenAPI documentation and GraphQL endpoint. The architecture follows a modular route-based pattern:

### Core Components

- **App Entry**: `src/app.ts` - Main app configuration with route registration
- **Server**: `src/index.ts` - Development server using @hono/node-server
- **Environment**: `src/env.ts` - Type-safe environment validation with Zod
- **Database**: Drizzle ORM with SQLite/Turso, schema in `src/db/schema.ts`

### Route Structure Pattern

Each feature follows this structure (see `src/routes/tasks/` as reference):

- `{feature}.index.ts` - Router export and configuration
- `{feature}.routes.ts` - OpenAPI route definitions with Zod schemas
- `{feature}.handlers.ts` - Request handlers (controllers)
- `{feature}.test.ts` - Route unit tests

### Key Features

- **OpenAPI Integration**: Routes use `@hono/zod-openapi` for type-safe API documentation
- **GraphQL**: Auto-generated from Drizzle schema using `drizzle-graphql`
- **Analytics**: Optional request logging when `ENABLE_ANALYTICS=true`
- **Type Safety**: All schemas defined with Zod, shared between validation and TypeScript types

### Database Schema

- **Tasks**: Hierarchical task system with parent-child relationships stored as JSON
- **Requests**: Analytics table for request logging with automatic cleanup

### Testing Configuration

- Tests run sequentially (`singleFork: true`) to avoid database conflicts
- Uses `@` alias for `./src` imports
- Test environment loads `.env.test` if available

### Code Style

- Uses `@antfu/eslint-config` with TypeScript, formatters, and stylistic rules
- Enforces kebab-case filenames, double quotes, 2-space indentation
- Prohibits `process.env` usage (use `env.ts` instead)
- Database migrations are ignored by ESLint

### Environment Variables

Required: `DATABASE_URL`, `LOG_LEVEL`
Optional: `NODE_ENV`, `PORT`, `DATABASE_AUTH_TOKEN` (production only), `ENABLE_ANALYTICS`, `ANALYTICS_RETENTION_DAYS`

### Type Export Pattern

All routes are grouped and exported as `AppType` in `app.ts` for RPC client usage with hono/client.
