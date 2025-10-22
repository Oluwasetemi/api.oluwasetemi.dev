import { sql } from "drizzle-orm";

import db from "@/db";
import { posts } from "@/db/schema";

/**
 * Generate a URL-friendly slug from a title
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters (keeps only a-z, 0-9, hyphens)
 * - Removes leading/trailing hyphens
 * - Collapses multiple consecutive hyphens to single hyphen
 *
 * @param title - The title to convert to a slug
 * @returns A URL-friendly slug
 *
 * @example
 * generateSlugFromTitle("My Awesome Post!") // "my-awesome-post"
 * generateSlugFromTitle("Hello  World") // "hello-world"
 * generateSlugFromTitle("Test@#$%Post") // "test-post"
 */
export function generateSlugFromTitle(title: string): string {
  if (!title || title.trim().length === 0) {
    // Fallback for empty titles
    return `post-${Date.now()}`;
  }

  return title
    .toLowerCase() // Convert to lowercase
    .normalize("NFKD") // Normalize unicode characters
    .replace(/[\u0300-\u036F]/g, "") // Remove diacritics
    .replace(/[^\w\s-]/g, "") // Remove special characters (keep word chars, spaces, hyphens)
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+/, "") // Remove leading hyphens
    .replace(/-+$/, "") // Remove trailing hyphens
    .substring(0, 100) // Limit length to 100 characters
    || `post-${Date.now()}`; // Fallback if result is empty
}

/**
 * Ensure a slug is unique by appending a number suffix if needed
 * Checks the database for existing slugs and appends -1, -2, -3, etc.
 *
 * @param baseSlug - The base slug to check for uniqueness
 * @param existingId - Optional ID to exclude from uniqueness check (for updates)
 * @returns A unique slug
 *
 * @example
 * await ensureUniqueSlug("my-post") // "my-post" (if available)
 * await ensureUniqueSlug("my-post") // "my-post-1" (if "my-post" exists)
 * await ensureUniqueSlug("my-post") // "my-post-2" (if "my-post" and "my-post-1" exist)
 * await ensureUniqueSlug("my-post", "existing-id") // "my-post" (if only owned by existing-id)
 */
export async function ensureUniqueSlug(baseSlug: string, existingId?: string): Promise<string> {
  // First, check if the base slug is available
  const exactMatch = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.slug, baseSlug);
    },
  });

  // If no match, or match is the current post being updated, use base slug
  if (!exactMatch || (existingId && exactMatch.id === existingId)) {
    return baseSlug;
  }

  // Find all slugs that start with the base slug pattern
  // This includes: "base-slug", "base-slug-1", "base-slug-2", etc.
  const similarSlugs = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(
      sql`${posts.slug} = ${baseSlug} OR ${posts.slug} LIKE ${`${baseSlug}-%`}`,
    );

  // Filter to only numeric suffixes and exclude the existing post if updating
  const existingSuffixes: number[] = [];

  for (const { slug } of similarSlugs) {
    if (!slug)
      continue;

    // Skip if this is the post being updated
    const post = await db.query.posts.findFirst({
      where(fields, operators) {
        return operators.eq(fields.slug, slug);
      },
    });
    if (post && existingId && post.id === existingId) {
      continue;
    }

    // Check if it's the exact base slug
    if (slug === baseSlug) {
      existingSuffixes.push(0);
      continue;
    }

    // Extract numeric suffix (e.g., "my-post-123" -> 123)
    const match = slug.match(new RegExp(`^${escapeRegex(baseSlug)}-(\\d+)$`));
    if (match && match[1]) {
      existingSuffixes.push(Number.parseInt(match[1], 10));
    }
  }

  // Find the next available suffix
  if (existingSuffixes.length === 0) {
    return baseSlug;
  }

  // Sort suffixes and find the first gap, or use max + 1
  existingSuffixes.sort((a, b) => a - b);

  let nextSuffix = 1;
  for (const suffix of existingSuffixes) {
    if (suffix === nextSuffix - 1) {
      nextSuffix++;
    }
    else if (suffix >= nextSuffix) {
      break;
    }
  }

  return `${baseSlug}-${nextSuffix}`;
}

/**
 * Escape special regex characters in a string
 * Used for safely creating regex patterns from user input
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate slug format
 * Must be lowercase alphanumeric with hyphens only
 *
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
