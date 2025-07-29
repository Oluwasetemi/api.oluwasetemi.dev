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

## Recent Updates & Security Improvements

### Security Fixes (Latest)

- **Rate Limiter Security**: Fixed critical IP extraction vulnerability in `src/middlewares/rate-limiter.ts`

  - Corrected improper use of `c.env?.incoming?.socket?.remoteAddress` (Hono-specific issue)
  - Added multi-runtime support for Node.js, Cloudflare Workers, Deno, and Bun
  - Implemented proper proxy chain validation to prevent header spoofing attacks
  - Fixed security hole where `cf-connecting-ip` was trusted even when `RATE_LIMIT_TRUST_PROXY=false`

- **HTTP Headers**: Fixed `convertCamelToKebab` function in `src/middlewares/security-headers.ts`
  - Now correctly formats headers: `contentSecurityPolicy` → `Content-Security-Policy`
  - Previously produced malformed headers like `content-Security-Policy`

### GraphQL Enhancements

- **Custom Queries**: Added `countRequests` query for analytics with filtering and grouping
  - Supports filtering by `from`, `to`, `path`, `method`
  - Supports grouping by `day`, `path`, `method`
  - Returns structured data with `total`, `data[]`, and `groupedBy` fields

### Testing Infrastructure

- **Test Setup Improvements**: Enhanced `src/lib/test-setup.ts`
  - Added proper database table cleanup with Drizzle ORM delete operations
  - Fixed timeout issues with database migrations in test environments
  - Improved error handling and async operation management

### JWT Authentication System (Latest)

- **Comprehensive Authentication**: Implemented complete JWT-based authentication system

  - Access tokens (24h) and refresh tokens (7d) with secure payload structure
  - Password validation with complexity requirements (uppercase, lowercase, digits, special chars)
  - Email normalization and duplicate prevention with unique constraints
  - bcrypt password hashing with environment-specific rounds (dev: 6, prod: 12)
  - Last login tracking and user activation status management

- **Database Schema Enhancements**: Extended user model with authentication fields

  - Added `users` table with `id`, `email`, `password`, `name`, `imageUrl`, `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`
  - Added foreign key constraint for `tasks.owner` referencing `users.id`
  - Proper indexing for email lookups and user relationships

- **GraphQL Authentication Integration**: Complete GraphQL auth implementation

  - `register(email, password, name?, imageUrl?)` - User registration with validation
  - `login(email, password)` - User authentication with credential verification
  - `refreshToken(refreshToken)` - Token refresh with user validation
  - `me` - Protected query to get current authenticated user with proper context
  - Proper timestamp handling and user data formatting for GraphQL responses

- **REST API Authentication Routes**: OpenAPI-documented authentication endpoints

  - `POST /auth/register` - User registration with comprehensive validation
  - `POST /auth/login` - User login with credential verification
  - `POST /auth/refresh` - Token refresh endpoint
  - `GET /auth/me` - Protected route to get current user data
  - Consistent error handling and response formatting across all endpoints

- **Authentication Middleware**: Secure request authentication and authorization

  - JWT token verification with proper error handling
  - User context injection with actual database timestamps (no placeholders)
  - Performance optimization with JWT payload caching in non-production environments
  - Comprehensive test coverage with 34+ test cases across REST and GraphQL

- **Security Improvements**: Enhanced security measures throughout the system
  - Fixed timestamp conversion bugs preventing Invalid Date values
  - Resolved stale lastLoginAt issues by updating timestamps before responses
  - Proper user data fetching with actual timestamps instead of placeholder values
  - Rate limiting bypass in test environment to prevent test interference

### New Environment Variables

Authentication configuration:

- `JWT_SECRET` - Secret key for JWT access token signing (required, min 32 chars)
- `JWT_EXPIRES_IN` - Access token expiration time (default: 24h)
- `JWT_REFRESH_SECRET` - Secret key for JWT refresh token signing (required, min 32 chars)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration time (default: 7d)

Rate limiting and security configuration:

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting (default: true)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 900000)
- `RATE_LIMIT_TRUST_PROXY` - Trust proxy headers for IP extraction (default: false)
- `RATE_LIMIT_TRUSTED_PROXIES` - Comma-separated list of trusted proxy IPs
- `RATE_LIMIT_SKIP_SUCCESSFUL` - Only count failed requests (default: false)
- `RATE_LIMIT_SKIP_FAILED` - Only count successful requests (default: false)

Security headers configuration:

- `SECURITY_HEADERS_ENABLED` - Enable security headers middleware (default: true)

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
- **GraphQL**: Auto-generated from Drizzle schema using `drizzle-graphql` with custom resolvers
- **JWT Authentication**: Complete authentication system with REST and GraphQL support
- **Analytics**: Optional request logging when `ENABLE_ANALYTICS=true`
- **Rate Limiting**: Configurable rate limiting with multi-runtime IP extraction
- **Security Headers**: Comprehensive security headers with proper formatting
- **Type Safety**: All schemas defined with Zod, shared between validation and TypeScript types

### Database Schema

- **Users**: Authentication system with JWT support, password hashing, and user management
  - Foreign key relationships with tasks for ownership tracking
  - Proper indexing for email lookups and authentication performance
- **Tasks**: Hierarchical task system with parent-child relationships and user ownership
  - Owner field references users table for proper access control
  - JSON storage for flexible child task relationships
- **Requests**: Analytics table for request logging with automatic cleanup

### Testing Configuration

- Tests run sequentially (`singleFork: true`) to avoid database conflicts
- Uses `@` alias for `./src` imports
- Test environment loads `.env.test` if available
- Enhanced test setup with proper database cleanup and timeout handling

### Code Style

- Uses `@antfu/eslint-config` with TypeScript, formatters, and stylistic rules
- Enforces kebab-case filenames, double quotes, 2-space indentation
- Prohibits `process.env` usage (use `env.ts` instead)
- Database migrations are ignored by ESLint

### Environment Variables

**Required**: `DATABASE_URL`, `LOG_LEVEL`

**Required for Authentication**: `JWT_SECRET`, `JWT_REFRESH_SECRET`

**Optional**:

- Core: `NODE_ENV`, `PORT`, `DATABASE_AUTH_TOKEN` (production only)
- Authentication: `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- Analytics: `ENABLE_ANALYTICS`, `ANALYTICS_RETENTION_DAYS`
- Rate Limiting: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_TRUST_PROXY`, `RATE_LIMIT_TRUSTED_PROXIES`, `RATE_LIMIT_SKIP_SUCCESSFUL`, `RATE_LIMIT_SKIP_FAILED`
- Security: `SECURITY_HEADERS_ENABLED`

### Type Export Pattern

All routes are grouped and exported as `AppType` in `app.ts` for RPC client usage with hono/client.
