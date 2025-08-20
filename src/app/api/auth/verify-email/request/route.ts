import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { randomBytes } from "crypto";
import { emailVerificationLinkTemplate } from "@/lib/emailTemplates";
import { sendUserNotification } from "@/lib/email";

// POST: issue a new email verification link (idempotent if already verified)
export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userDocRef = db.collection(COLLECTIONS.USERS).doc(user.id);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found", correlationId }, { status: 404 });
    }
    const data = userSnap.data() || {};
    if (data.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true, correlationId });
    }

    // Create token (32 bytes -> 64 hex chars) and store hashed for security
    const tokenRaw = randomBytes(32).toString("hex");
    const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenRaw));
    const tokenHashHex = Array.from(new Uint8Array(tokenHash)).map(b=>b.toString(16).padStart(2,"0")).join("");
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24h

    await userDocRef.set({ emailVerification: { tokenHash: tokenHashHex, expiresAt, issuedAt: Date.now() }, updatedAt: Date.now() }, { merge: true });

    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${tokenRaw}`;

    const tpl = emailVerificationLinkTemplate({ fullName: data.fullName || data.displayName || "there", verifyUrl });
    await sendUserNotification(user.email, tpl.subject, tpl.html);

    return NextResponse.json({ ok: true, correlationId, expiresAt }, { status: 200 });
  } catch (e) {
    console.error("verify-email.request error", { correlationId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Failed to send verification", correlationId }, { status: 500 });
  } finally {
    if (process.env.NODE_ENV !== "production") {
      console.info("verify-email.request", { correlationId, durationMs: Date.now() - startedAt });
    }
  }
});
