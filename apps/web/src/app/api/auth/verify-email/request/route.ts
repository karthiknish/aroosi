import { NextRequest } from "next/server";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { randomBytes } from "crypto";
import { sendVerificationLinkEmail } from "@/lib/auth/email";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";

// POST: issue a new email verification link (idempotent if already verified)
export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { user, correlationId } = ctx;
  
  try {
    const userDocRef = db.collection(COLLECTIONS.USERS).doc(user.id);
    const userSnap = await userDocRef.get();
    
    if (!userSnap.exists) {
      return errorResponse("User not found", 404, { correlationId });
    }
    
    const data = userSnap.data() || {};
    if (data.emailVerified) {
      return successResponse({ alreadyVerified: true }, 200, correlationId);
    }

    // Create token (32 bytes -> 64 hex chars) and store hashed for security
    const tokenRaw = randomBytes(32).toString("hex");
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(tokenRaw)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expiresAt = nowTimestamp() + 1000 * 60 * 60 * 24; // 24h

    await userDocRef.set(
      {
        emailVerification: {
          tokenHash: tokenHashHex,
          expiresAt,
          issuedAt: nowTimestamp(),
        },
        updatedAt: nowTimestamp(),
      },
      { merge: true }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${tokenRaw}`;

    // Note: AuthenticatedUser might not have email if it just came from ID token without Firestore
    const email = user.email || data.email;
    if (!email) {
      return errorResponse("User email not found", 400, { correlationId });
    }

    await sendVerificationLinkEmail(
      email,
      data.fullName || data.displayName || "there",
      verifyUrl
    );

    return successResponse({ expiresAt }, 200, correlationId);
  } catch (e) {
    console.error("[auth.verify-email.request] fatal error", {
      correlationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return errorResponse("Failed to send verification email", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "auth_verify_email_request", maxRequests: 5 }
});

