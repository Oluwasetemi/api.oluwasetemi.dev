import { AuthService, extractBearerToken } from "@/lib/auth";
import { logger } from "@/middlewares/pino-logger";
import { formatUserForGraphQL, getUserWithTimestamps } from "@/utils/time";

/**
 * Resolve a user from a raw JWT token for use in GraphQL context or other authenticated operations.
 *
 * @param token - The raw JWT access token (without "Bearer " prefix)
 * @returns The user object formatted for GraphQL when the token is valid, active, and maps to a user; `null` otherwise
 */
export async function resolveUserFromToken(token: string) {
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
    // Expected auth failures (expired/invalid tokens) are common in normal operation
    // Only log unexpected errors to avoid noisy logs in production
    if (error instanceof Error) {
      const isExpectedAuthFailure = error.message.includes("verification failed")
        || error.message.includes("expired")
        || error.message.includes("Invalid token");

      if (isExpectedAuthFailure) {
        // Log at debug level for expected auth failures
        logger.debug({ error: error.message }, "Authentication failed");
      }
      else {
        // Log unexpected errors at error level with full details
        logger.error({ error: error.message, stack: error.stack }, "Unexpected error during token verification");
      }
    }
    else {
      // Non-Error objects are unexpected
      logger.error({ error }, "Unexpected non-Error thrown during token verification");
    }

    return null;
  }
}

/**
 * Resolve a user from an Authorization header's Bearer token.
 * Extracts the Bearer token from the header and resolves the user.
 *
 * @param authHeader - The value of the Authorization header which may contain a Bearer token (or undefined if not provided)
 * @returns The user object formatted for GraphQL when the token is valid, active, and maps to a user; `null` otherwise
 */
export async function getUserFromToken(authHeader: string | undefined) {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  return resolveUserFromToken(token);
}
