import type { z } from "zod";

import type { PriorityEnum, StatusEnum } from "./schema";

import db from "./index";
import { tasks } from "./schema";

const defaultTasks = Array.from({ length: 500 }, (_, i) => ({
  name: `Default Task ${i + 1}`,
  description: `This is a default task ${i + 1}`,
  priority: "MEDIUM" as const,
  status: "TODO" as const,
  isDefault: true,
}));

export async function seed() {
  console.warn("🌱 Seeding database...");

  try {
    await db.insert(tasks).values(defaultTasks);
    console.warn("✅ Seeding completed successfully");
  }
  catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed();
