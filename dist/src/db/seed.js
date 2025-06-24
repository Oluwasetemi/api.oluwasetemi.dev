import db from "./index.js";
import { tasks } from "./schema.js";
const defaultTasks = Array.from({ length: 500 }, (_, i) => ({
    name: `Default Task ${i + 1}`,
    description: `This is a default task ${i + 1}`,
    priority: "MEDIUM",
    status: "TODO",
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
