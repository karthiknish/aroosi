/**
 * Delivery Receipts API - Handles message delivery/read receipts
 */

export type DeliveryReceiptStatus = "delivered" | "read" | "failed";

export interface DeliveryReceipt {
  messageId: string;
  userId: string;
  status: DeliveryReceiptStatus;
  updatedAt: number;
}

class DeliveryReceiptsAPI {
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

  async getReceipts(conversationId: string): Promise<DeliveryReceipt[]> {
    const res = await this.makeRequest(
      `/api/delivery-receipts?conversationId=${encodeURIComponent(conversationId)}`
    );
    const deliveryReceipts = res?.data?.deliveryReceipts || res?.deliveryReceipts || [];
    if (!Array.isArray(deliveryReceipts)) return [];

    return deliveryReceipts
      .map((r: any) => ({
        messageId: String(r?.messageId || ""),
        userId: String(r?.userId || ""),
        status: (r?.status as DeliveryReceiptStatus) || "delivered",
        updatedAt: Number(r?.updatedAt ?? r?.timestamp ?? Date.now()),
      }))
      .filter((r: DeliveryReceipt) => r.messageId && r.userId);
  }

  async sendReceipt(messageId: string, status: DeliveryReceiptStatus): Promise<void> {
    await this.makeRequest("/api/delivery-receipts", {
      method: "POST",
      body: JSON.stringify({ messageId, status }),
    });
  }
}

export const deliveryReceiptsAPI = new DeliveryReceiptsAPI();
