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
