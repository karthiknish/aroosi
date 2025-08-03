import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import type { Id } from "@convex/_generated/dataModel";

// NOTE: Explicit JSON helper to avoid accidental 404/redirect behavior from wrappers.
const json = (data: unknown, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Initialize Convex client (best-effort)
const convexClient = getConvexClient();

export async function GET(request: NextRequest) {
  try {
    // Authentication (app-layer auth)
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) {
      // Normalize helper response to plain JSON
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { success: false, error: "Authentication failed" };
      try {
        const txt = await res.text();
        body = txt ? JSON.parse(txt) : body;
      } catch {}
      return json(body, status);
    }
    const { userId } = authCheck;

    // Rate limiting for fetching blocked users
    const rateLimitResult = checkApiRateLimit(`safety_blocked_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      return json({ success: false, error: "Rate limit exceeded" }, 429);
    }

    const client = convexClient ?? getConvexClient();
    if (!client) {
      return json({ success: false, error: "Database connection failed" }, 500);
    }

    // Resolve Convex identity via server-side function (no client-side JWT to Convex)
    const currentUser = (await client.query(api.users.getCurrentUserWithProfile, {})) as
      | { _id: Id<"users"> }
      | null;

    if (!currentUser) {
      return json({ success: false, error: "User record not found" }, 404);
    }

    // Get blocked users by explicit user id
    const blockedUsers = await client.query(api.safety.getBlockedUsers, {
      blockerUserId: currentUser._id,
    });

    return json({ success: true, blockedUsers: blockedUsers || [] }, 200);
  } catch (error) {
    console.error("Error in safety blocked users API:", error);
    return json({ success: false, error: "Failed to fetch blocked users" }, 500);
  }
}