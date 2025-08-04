import { handleErrorUtil, blockUserUtil, reportUserUtil, ReportReason } from "@/lib/chat/utils";

/**
 * Thin service wrappers around moderation utilities.
 * Keeps ModernChat and hooks free of action wiring and error mapping.
 */

export async function blockUserService(params: {
  matchUserId: string;
  token: string;
  setIsBlocked: (v: boolean) => void;
  setShowReportModal: (v: boolean) => void;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await blockUserUtil(params);
    return { ok: true };
  } catch (err) {
    const mapped = handleErrorUtil(err);
    return { ok: false, message: mapped.message };
  }
}

export async function reportUserService(params: {
  matchUserId: string;
  reason: ReportReason;
  description: string;
  token: string;
  setShowReportModal: (v: boolean) => void;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await reportUserUtil(params);
    return { ok: true };
  } catch (err) {
    const mapped = handleErrorUtil(err);
    return { ok: false, message: mapped.message };
  }
}

export type { ReportReason };