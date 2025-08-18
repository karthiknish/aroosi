import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";

export type DeviceItem = {
  userId: string;
  email: string | null;
  playerId: string;
  deviceType: string;
  deviceToken: string | null;
  isActive: boolean;
  registeredAt: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const { role } = await requireAuth(request);
    if ((role || "user") !== "admin")
      return errorResponse("Admin privileges required", 403);
  } catch {
    return errorResponse("Unauthorized", 401);
  }
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") || 20))
  );

  try {
    // Fetch active push tokens
    const snap = await db
      .collection("pushTokens")
      .where("isActive", "==", true)
      .limit(5000)
      .get();

    const rawItems: Array<{ id: string; [key: string]: unknown }> =
      snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));

    // Enrich with user email
    const userIds = Array.from(
      new Set(rawItems.map((i) => String((i as any).userId)))
    );
    const idToEmail = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid: string) => {
        try {
          const u = await db.collection("users").doc(uid).get();
          if (u.exists) {
            const data = u.data() as any;
            idToEmail.set(uid, data?.email || data?.contactEmail || "");
          }
        } catch {}
      })
    );
    const normalized: DeviceItem[] = rawItems.map((i: any) => ({
      userId: String(i.userId || ""),
      email: idToEmail.get(String(i.userId)) || null,
      playerId: String(i.playerId || i.token || i.id || ""),
      deviceType: String(i.deviceType || "web"),
      deviceToken: i.token ? String(i.token) : null,
      isActive: Boolean(i.isActive),
      registeredAt:
        typeof i.registeredAt === "number" ? (i.registeredAt as number) : null,
    }));

    // Filter by search
    const filtered = normalized.filter((i: DeviceItem) => {
      if (!search) return true;
      return (
        String(i.email || "")
          .toLowerCase()
          .includes(search) ||
        String(i.playerId || "")
          .toLowerCase()
          .includes(search) ||
        String(i.deviceType || "")
          .toLowerCase()
          .includes(search)
      );
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return successResponse({ items: paged, total, page, pageSize });
  } catch (err) {
    console.error("devices list error", err);
    return errorResponse("Failed to list devices", 500);
  }
}
