import { NextRequest, NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";

// GET /api/auth/verify-email?token=...  (public link)
export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Missing token", correlationId }, { status: 400 });
    }
    // Hash supplied token to compare
    const tokenHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHashHex = Array.from(new Uint8Array(tokenHashBuf)).map(b=>b.toString(16).padStart(2,"0")).join("");

    // Find user with matching emailVerification.tokenHash (index recommended) - fallback to scan single doc via query
    const snap = await db.collection(COLLECTIONS.USERS).where("emailVerification.tokenHash", "==", tokenHashHex).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Invalid or expired token", correlationId }, { status: 400 });
    }
    const doc = snap.docs[0];
    const data = doc.data() as any;
    const meta = data.emailVerification || {};
    if (!meta.expiresAt || meta.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Token expired", correlationId }, { status: 400 });
    }

    await doc.ref.set({ emailVerified: true, emailVerification: { ...meta, verifiedAt: Date.now() }, updatedAt: Date.now() }, { merge: true });

    // OPTIONAL: redirect to success page instead of JSON
    const redirectBase = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
    const successUrl = `${redirectBase}/email-verified`; // route/page to create separately if desired
    return NextResponse.redirect(successUrl, { status: 302 });
  } catch (e) {
    console.error("verify-email.consume error", { correlationId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Verification failed", correlationId }, { status: 500 });
  } finally {
    if (process.env.NODE_ENV !== "production") {
      console.info("verify-email.consume", { correlationId, durationMs: Date.now() - startedAt });
    }
  }
}
