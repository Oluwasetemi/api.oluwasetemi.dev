import { seed } from "drizzle-seed";

import db from ".";
import { tasks } from "./schema";

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  if (shouldReset) {
    console.log("🗑️  Resetting database...");
    try {
      await db.delete(tasks);
      console.log("✅ Database reset successful!");
    }
    catch (error) {
      console.error("❌ Error resetting database:", error);
      process.exit(1);
    }
  }

  console.log("🌱 Starting to seed 500 todos...");

  await seed(db as any, { tasks }).refine(f => ({
    tasks: {
      count: 500,
      columns: {
        id: f.uuid(),
        name: f.weightedRandom([
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Complete project documentation",
                "Review pull requests",
                "Update dependencies",
                "Write unit tests",
                "Fix bug in authentication",
                "Optimize database queries",
                "Deploy to staging",
                "Code review for team",
                "Update API documentation",
                "Implement new feature",
                "Refactor legacy code",
                "Set up monitoring",
                "Configure CI/CD pipeline",
                "Security audit",
                "Performance testing",
                "User acceptance testing",
                "Backup database",
                "Update SSL certificates",
                "Monitor system resources",
                "Debug production issue",
              ],
            }),
          },
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "Call client about requirements",
                "Schedule team meeting",
                "Prepare presentation slides",
                "Update project timeline",
                "Review budget allocation",
                "Coordinate with stakeholders",
                "Plan sprint activities",
                "Update status reports",
                "Follow up on emails",
                "Organize team event",
                "Update process documentation",
                "Conduct user interviews",
                "Analyze competitor data",
                "Prepare quarterly review",
                "Coordinate with vendors",
                "Update risk assessment",
                "Plan training sessions",
                "Review compliance requirements",
                "Update marketing materials",
                "Organize workshop",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Buy groceries",
                "Clean apartment",
                "Pay utility bills",
                "Schedule dentist appointment",
                "Book flight tickets",
                "Renew insurance policy",
                "Organize closet",
                "Plan weekend trip",
                "Call family members",
                "Update resume",
                "Research new restaurants",
                "Plan birthday party",
                "Fix household items",
                "Update emergency contacts",
                "Plan workout routine",
                "Organize digital files",
                "Update personal budget",
                "Plan vacation itinerary",
                "Schedule car maintenance",
                "Update personal goals",
              ],
            }),
          },
        ]),
        description: f.weightedRandom([
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "Complete the task as soon as possible",
                "This needs to be done by the end of the week",
                "High priority item that requires attention",
                "Standard task with normal priority",
                "Routine maintenance task",
                "Quick fix that should be simple",
                "Important feature that needs testing",
                "Bug fix that was reported by users",
                "Documentation update required",
                "Performance improvement needed",
                "Security update for the system",
                "User interface enhancement",
                "Database optimization task",
                "API endpoint modification",
                "Mobile app feature update",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "High priority task that needs immediate attention",
                "This task is part of the current sprint",
                "Blocked by external dependency",
                "Requires approval from stakeholders",
                "Needs to be completed before the deadline",
                "This is a recurring task",
                "Depends on other team members",
                "Requires additional research",
                "Part of the technical debt cleanup",
                "Customer-facing feature",
                "Internal tool improvement",
                "Security-related task",
                "Performance optimization needed",
                "Documentation update required",
                "Testing and validation needed",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.default({ defaultValue: "" }),
          },
        ]),
        priority: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: "HIGH" }) },
          { weight: 0.5, value: f.default({ defaultValue: "MEDIUM" }) },
          { weight: 0.3, value: f.default({ defaultValue: "LOW" }) },
        ]),
        status: f.weightedRandom([
          { weight: 0.4, value: f.default({ defaultValue: "TODO" }) },
          { weight: 0.3, value: f.default({ defaultValue: "IN_PROGRESS" }) },
          { weight: 0.2, value: f.default({ defaultValue: "DONE" }) },
          { weight: 0.1, value: f.default({ defaultValue: "CANCELLED" }) },
        ]),
        start: f.weightedRandom([
          {
            weight: 0.6,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.4,
            value: f.default({ defaultValue: null }),
          },
        ]),
        end: f.weightedRandom([
          {
            weight: 0.5,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.5,
            value: f.default({ defaultValue: null }),
          },
        ]),
        duration: f.weightedRandom([
          {
            weight: 0.3,
            value: f.int({ minValue: 30, maxValue: 120 }), // 30-120 minutes
          },
          {
            weight: 0.4,
            value: f.int({ minValue: 240, maxValue: 480 }), // 4-8 hours
          },
          {
            weight: 0.2,
            value: f.int({ minValue: 1440, maxValue: 2880 }), // 1-2 days
          },
          {
            weight: 0.1,
            value: f.default({ defaultValue: null }),
          },
        ]),
        archived: f.weightedRandom([
          { weight: 0.9, value: f.default({ defaultValue: false }) },
          { weight: 0.1, value: f.default({ defaultValue: true }) },
        ]),
        is_default: f.default({ defaultValue: true }),
        owner: f.weightedRandom([
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "john.doe@company.com",
                "jane.smith@company.com",
                "mike.johnson@company.com",
                "sarah.wilson@company.com",
                "david.brown@company.com",
                "emma.davis@company.com",
                "alex.taylor@company.com",
                "lisa.anderson@company.com",
                "chris.martin@company.com",
                "rachel.garcia@company.com",
              ],
            }),
          },
          {
            weight: 0.6,
            value: f.default({ defaultValue: null }),
          },
        ]),
        tags: f.weightedRandom([
          {
            weight: 0.6,
            value: f.valuesFromArray({
              values: [
                "frontend,urgent",
                "backend,feature",
                "bug,high-priority",
                "documentation,low-priority",
                "testing,medium-priority",
                "deployment,urgent",
                "refactoring,tech-debt",
                "security,high-priority",
                "performance,optimization",
                "ui/ux,feature",
                "api,integration",
                "database,migration",
                "mobile,feature",
                "analytics,reporting",
                "automation,ci/cd",
              ],
            }),
          },
          {
            weight: 0.4,
            value: f.default({ defaultValue: null }),
          },
        ]),
        completedAt: f.weightedRandom([
          {
            weight: 0.2,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.8,
            value: f.default({ defaultValue: null }),
          },
        ]),
        children: f.default({ defaultValue: "[]" }),
        parentId: f.default({ defaultValue: null }),
      },
    },
  }));

  console.log("✅ Successfully seeded 500 todos!");
}

main().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
