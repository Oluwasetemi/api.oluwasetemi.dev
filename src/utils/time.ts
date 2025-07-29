import type { JWTPayload } from "@/lib/auth";

import { AuthService } from "@/lib/auth";

export function timestampToISOString(timestamp: Date | number | null): string | null {
  if (!timestamp)
    return null;
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  // Handle numeric timestamps (from integer mode)
  return new Date(timestamp).toISOString();
}

export function formatUserForGraphQL(user: any) {
  return {
    ...user,
    lastLoginAt: timestampToISOString(user.lastLoginAt),
    createdAt: timestampToISOString(user.createdAt),
    updatedAt: timestampToISOString(user.updatedAt),
  };
}

// Utility to get complete user data from JWT payload (with actual timestamps)
export async function getUserWithTimestamps(payload: JWTPayload) {
  // For performance, we could cache the JWT data and only fetch timestamps when needed
  // But for accuracy, let's fetch complete user data
  const user = await AuthService.findUserById(payload.userId);

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}
