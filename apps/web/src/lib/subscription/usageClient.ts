// Lightweight client helper to invoke track-usage endpoint
export async function trackFeatureUsageClient(feature: string, metadata?: Record<string, any>) {
  try {
    const res = await fetch('/api/subscription/track-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, metadata })
    });
    if (!res.ok) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
