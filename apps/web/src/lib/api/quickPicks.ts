/**
 * QuickPicks API - Handles quick picks operations
 */

import type { QuickPick as SharedQuickPick } from "@aroosi/shared/types";
import { getResponseMessage, isApiEnvelope } from "@/lib/api/safeRequest";

export type QuickPick = SharedQuickPick;

type EnsureQuickPicksResponse = {
  generated?: boolean;
  count?: number;
};

class QuickPicksAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload: unknown = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(getResponseMessage(payload) ?? `HTTP ${res.status}`);
    }

    if (isApiEnvelope<T>(payload)) {
      if (payload.success === false) {
        throw new Error(getResponseMessage(payload) ?? "Request failed");
      }

      if ("data" in payload) {
        return payload.data as T;
      }
    }

    return payload as T;
  }

  /**
   * Ensure quick picks are generated for today
   */
  async ensure(): Promise<{ generated: boolean; count: number }> {
    const res = await this.makeRequest<EnsureQuickPicksResponse>("/api/quickpicks/ensure", {
      method: "POST",
    });
    return {
      generated: res.generated ?? false,
      count: res.count ?? 0,
    };
  }
}

export const quickPicksAPI = new QuickPicksAPI();
