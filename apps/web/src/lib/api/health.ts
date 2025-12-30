/**
 * Health API - Handles health check operations
 */

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services?: {
    database?: "up" | "down";
    storage?: "up" | "down";
    auth?: "up" | "down";
  };
  version?: string;
}

class HealthAPI {
  private async makeRequest(endpoint: string): Promise<any> {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data;
        }
      }
    }

    return payload;
  }

  /**
   * Check API health status
   */
  async check(): Promise<HealthStatus> {
    const res = await this.makeRequest("/api/health");
    return {
      status: res.status || "healthy",
      timestamp: res.timestamp || new Date().toISOString(),
      services: res.services,
      version: res.version,
    };
  }

  /**
   * Debug profiles endpoint (dev only)
   */
  async debugProfiles(): Promise<any> {
    return this.makeRequest("/api/debug-profiles");
  }
}

export const healthAPI = new HealthAPI();
