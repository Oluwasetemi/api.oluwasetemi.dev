/* eslint-disable no-console */
import * as cron from "node-cron";

import env from "@/env";
import { pruneOld } from "@/services/analytics.service";

/**
 * Sets up a cron job to clean up old analytics data
 * Runs daily at 2 AM
 */
export function setupAnalyticsCleanup() {
  // Only set up cleanup if analytics is enabled
  if (!env.ENABLE_ANALYTICS) {
    console.log("Analytics cleanup skipped - analytics disabled");
    return;
  }

  // Run daily at 2 AM
  cron.schedule("0 2 * * *", () => {
    console.log("Running analytics cleanup job...");
    pruneOld(env.ANALYTICS_RETENTION_DAYS);
  });

  console.log(`Analytics cleanup scheduled - will retain ${env.ANALYTICS_RETENTION_DAYS} days of data`);
}

/**
 * Runs cleanup immediately (useful for manual cleanup or on startup)
 */
export function runCleanupNow() {
  if (!env.ENABLE_ANALYTICS) {
    console.log("Analytics cleanup skipped - analytics disabled");
    return;
  }

  console.log("Running analytics cleanup now...");
  pruneOld(env.ANALYTICS_RETENTION_DAYS);
}
