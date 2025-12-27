/**
 * QuickPicks API - Handles quick picks operations
 */

import type { QuickPick as SharedQuickPick } from "@aroosi/shared/types";

export type QuickPick = SharedQuickPick;

class QuickPicksAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    return payload;
  }

  /**
   * Ensure quick picks are generated for today
   */
  async ensure(): Promise<{ generated: boolean; count: number }> {
    const res = await this.makeRequest("/api/quickpicks/ensure", {
      method: "POST",
    });
    return {
      generated: res.data?.generated || res.generated || false,
      count: res.data?.count || res.count || 0,
    };
  }
}

export const quickPicksAPI = new QuickPicksAPI();
