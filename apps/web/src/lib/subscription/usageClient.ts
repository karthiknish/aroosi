// Lightweight client helper to invoke track-usage endpoint
import { subscriptionAPI } from "@/lib/api/subscription";

export async function trackFeatureUsageClient(feature: string, metadata?: Record<string, any>) {
  try {
    await subscriptionAPI.trackUsage(feature, metadata);
    return true;
  } catch {
    return false;
  }
}
