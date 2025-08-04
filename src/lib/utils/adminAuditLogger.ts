/**
 * Admin Audit Logger
 * Structured audit events for critical admin actions.
 * Persists to Convex via an action/mutation to enable compliance and incident response.
 *
 * Integration plan:
 * - Call requireAdminToken() in each /api/admin/* route to obtain { token, userId }.
 * - Ensure convex.setAuth(token) is called in that route before invoking adminAuditLog.
 * - Invoke adminAuditLog({ actorId: userId, action, targetId, metadata, timestamp: Date.now() }).
 * - Replace stubbed mutation call with your actual Convex audit mutation once added.
 */
import { getConvexClient } from "@/lib/convexClient";

export type AdminAuditAction =
  | "admin.profile.create"
  | "admin.profile.update"
  | "admin.profile.delete"
  | "admin.profile.ban"
  | "admin.profile.unban"
  | "admin.profile.spotlight"
  | "admin.matches.create"
  | "admin.marketing_email.send"
  | "admin.push_notification.send";

export interface AdminAuditEvent {
  actorId: string; // admin user id
  action: AdminAuditAction;
  targetId?: string; // profile id, match id, etc.
  metadata?: Record<string, unknown>;
  timestamp: number; // milliseconds since epoch
}

/**
 * Writes an audit event. Fails safe (logs to console if Convex unavailable).
 * Callers must set Convex auth (convex.setAuth(token)) before calling.
 */
export async function adminAuditLog(event: AdminAuditEvent): Promise<void> {
  try {
    const convex = getConvexClient();
    if (!convex) {
      console.warn("[adminAuditLog] Convex not configured", event);
      return;
    }
    // TODO: Replace with real Convex mutation when ready:
    // import { api } from "@convex/_generated/api";
    // await convex.mutation(api.audit.recordAdminEvent, event);
    console.info("[adminAuditLog] (stub) event", event);
  } catch (e) {
    console.error("[adminAuditLog] failed", {
      error: e instanceof Error ? e.message : String(e),
      event,
    });
  }
}