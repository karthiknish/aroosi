import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

type EmailVerificationDoc = {
  emailVerification?: {
    expiresAt?: number;
    [key: string]: unknown;
  };
};

async function resolveVerificationDoc(token: string) {
  const tokenHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHashHex = Array.from(new Uint8Array(tokenHashBuf)).map(b=>b.toString(16).padStart(2,"0")).join("");

  const snap = await db
    .collection(COLLECTIONS.USERS)
    .where("emailVerification.tokenHash", "==", tokenHashHex)
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "Invalid or expired token" } as const;
  }

  const doc = snap.docs[0];
  const data = doc.data() as EmailVerificationDoc;
  const meta = data.emailVerification || {};

  if (!meta.expiresAt || meta.expiresAt < nowTimestamp()) {
    return { error: "Token expired" } as const;
  }

  return { doc, meta } as const;
}

async function applyVerification(doc: FirebaseFirestore.QueryDocumentSnapshot, meta: Record<string, unknown>) {
  await doc.ref.set(
    {
      emailVerified: true,
      emailVerification: { ...meta, verifiedAt: nowTimestamp() },
      updatedAt: nowTimestamp(),
    },
    { merge: true }
  );
}

// GET /api/auth/verify-email?token=...  (public link)
export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = nowTimestamp();
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Missing token", correlationId }, { status: 400 });
    }
    const resolved = await resolveVerificationDoc(token);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error, correlationId }, { status: 400 });
    }

    await applyVerification(resolved.doc, resolved.meta as Record<string, unknown>);

    // OPTIONAL: redirect to success page instead of JSON
    const redirectBase = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
    const successUrl = `${redirectBase}/email-verified`; // route/page to create separately if desired
    return NextResponse.redirect(successUrl, { status: 302 });
  } catch (e) {
    console.error("verify-email.consume error", { correlationId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Verification failed", correlationId }, { status: 500 });
  } finally {
    if (process.env.NODE_ENV !== "production") {
      console.info("verify-email.consume", { correlationId, durationMs: nowTimestamp() - startedAt });
    }
  }
}

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const { token } = (await req.json().catch(() => ({}))) as { token?: string };

    if (!token?.trim()) {
      return NextResponse.json({ success: false, error: "Missing token", correlationId }, { status: 400 });
    }

    const resolved = await resolveVerificationDoc(token.trim());
    if ("error" in resolved) {
      return NextResponse.json({ success: false, error: resolved.error, correlationId }, { status: 400 });
    }

    await applyVerification(resolved.doc, resolved.meta as Record<string, unknown>);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("verify-email.consume POST error", { correlationId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ success: false, error: "Verification failed", correlationId }, { status: 500 });
  }
}
