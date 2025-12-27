import { z } from "zod";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { sendWelcomeEmail, sendVerificationLinkEmail } from "@/lib/auth/email";
import { randomBytes } from "crypto";

// Zod schema for registration body
const registerSchema = z.object({
  uid: z.string().min(1, "uid is required"),
  email: z.string().email("Invalid email"),
  displayName: z.string().optional(),
});

/**
 * POST /api/auth/register
 * Called by mobile app after client-side Firebase auth registration
 * Creates/updates the user document in Firestore
 */
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof registerSchema>) => {
    const authenticatedUid = (ctx.user as any).userId || (ctx.user as any).id || (ctx.user as any).uid;

    try {
      const { uid, email, displayName } = body;

      // Verify the authenticated user matches the registration request
      if (authenticatedUid !== uid) {
        return errorResponse("Unauthorized: UID mismatch", 403, { correlationId: ctx.correlationId });
      }

      const now = Date.now();
      const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
      const existingDoc = await userRef.get();

      if (existingDoc.exists) {
        // User already exists, just update last login
        await userRef.set(
          {
            lastLoginAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        return successResponse({
          ok: true,
          uid,
          isNewUser: false,
        }, 200, ctx.correlationId);
      }

      // Create new user document
      const userData = {
        email,
        fullName: displayName || null,
        displayName: displayName || null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        emailVerified: false,
        banned: false,
        subscriptionPlan: "free",
        profileComplete: false,
        onboardingComplete: false,
      };

      await userRef.set(userData);

      // Issue email verification token (24h expiry) & send email
      let verificationEmailQueued = false;
      try {
        const tokenRaw = randomBytes(32).toString("hex");
        const tokenHashBuf = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(tokenRaw)
        );
        const tokenHashHex = Array.from(new Uint8Array(tokenHashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const expiresAt = now + 1000 * 60 * 60 * 24; // 24h

        await userRef.set(
          {
            emailVerification: {
              tokenHash: tokenHashHex,
              issuedAt: now,
              expiresAt,
            },
          },
          { merge: true }
        );

        const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${tokenRaw}`;
        await sendVerificationLinkEmail(email, displayName || "there", verifyUrl);
        verificationEmailQueued = true;
      } catch (e) {
        console.warn("Failed to queue verification email", {
          uid,
          error: e instanceof Error ? e.message : String(e),
          correlationId: ctx.correlationId,
        });
      }

      // Send welcome email
      let welcomeEmailQueued = false;
      try {
        const sent = await sendWelcomeEmail(email, displayName || "there");
        if (sent) {
          welcomeEmailQueued = true;
          await userRef.set(
            { welcomeEmailSentAt: now },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn("Failed to send welcome email", {
          uid,
          error: e instanceof Error ? e.message : String(e),
          correlationId: ctx.correlationId,
        });
      }

      return successResponse({
        ok: true,
        uid,
        isNewUser: true,
        verificationEmailQueued,
        welcomeEmailQueued,
      }, 200, ctx.correlationId);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("auth/register error", {
        error: msg,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Registration failed", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: registerSchema,
    rateLimit: { identifier: "auth_register", maxRequests: 10, windowMs: 60000 }
  }
);
