import { AuthService } from "@/lib/auth";
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
    console.error("Error verifying auth token:", error);
    return null;
  }
}
