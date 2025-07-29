/**
 * Generate a new UUID using crypto.randomUUID()
 * This is used for pre-computing UUIDs for database records
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate multiple UUIDs at once
 * Useful when creating multiple related records
 */
export function generateUUIDs(count: number): string[] {
  return Array.from({ length: count }, () => generateUUID());
}

/**
 * Create a UUID map for related records
 * Useful for complex relationships where you need to reference IDs
 */
export function createUUIDMap<T extends string>(keys: T[]): Record<T, string> {
  return keys.reduce((acc, key) => {
    acc[key] = generateUUID();
    return acc;
  }, {} as Record<T, string>);
}
