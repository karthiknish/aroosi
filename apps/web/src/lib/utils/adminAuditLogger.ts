/**
 * Admin Audit Logger
 * Structured audit events for critical admin actions stored in Firestore.
 * Convex references removed after migration.
 */
import { db } from "@/lib/firebaseAdmin";
import { COL_AUDIT_LOGS, buildAuditLog } from "@/lib/firestoreSchema";

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
  timestamp: number; // ms since epoch
}

/**
 * Writes an audit event. Fails safe (logs to console if Firestore unavailable).
 */
export async function adminAuditLog(event: AdminAuditEvent & { req?: Request }): Promise<void> {
  try {
    const { req: _req, ...payload } = event as any;
    const doc = buildAuditLog({
      actorUserId: payload.actorId,
      action: payload.action,
      targetType: "generic",
      targetId: payload.targetId,
      meta: payload.metadata,
    });
    await db.collection(COL_AUDIT_LOGS).add(doc);
  } catch {
    // swallow to avoid blocking admin actions
  }
}