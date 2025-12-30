import {
  createApiHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { adminAuth, db, COLLECTIONS, getFirebaseUser } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { sendWelcomeEmail, sendVerificationLinkEmail } from "@/lib/auth/email";
import { randomBytes } from "crypto";
import { authRegisterSchema } from "@/lib/validation/apiSchemas/authRegister";

/**
 * POST /api/auth/register
 * Unified registration endpoint.
 */
export const POST = createApiHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof authRegisterSchema>
  ) => {
    const { uid: bodyUid, email, displayName, password } = body;
    const now = nowTimestamp();

    // ---------------------------------------------------------
    // MODE 1: Server-side Signup (Password provided)
    // ---------------------------------------------------------
    if (password) {
      try {
        // Create user with Firebase Admin SDK
        const userRecord = await adminAuth.createUser({
          email,
          password,
          displayName,
        });

        // Create a custom token
        const customToken = await adminAuth.createCustomToken(userRecord.uid);

        // Create user document
        await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
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
        });

        // Queue Verification Email
        let verificationEmailQueued = false;
        try {
          const tokenRaw = randomBytes(32).toString("hex");
          const tokenHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenRaw));
          const tokenHashHex = Array.from(new Uint8Array(tokenHashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
          const expiresAt = now + 1000 * 60 * 60 * 24; // 24h

          await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
            emailVerification: { tokenHash: tokenHashHex, issuedAt: now, expiresAt }
          }, { merge: true });

          const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
          const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${tokenRaw}`;
          await sendVerificationLinkEmail(email, displayName || "there", verifyUrl);
          verificationEmailQueued = true;
        } catch (e) {
          console.warn("Failed to queue verification email", { uid: userRecord.uid, error: String(e) });
        }

        // Send Welcome Email
        let welcomeEmailQueued = false;
        try {
          const sent = await sendWelcomeEmail(email, displayName || "there");
          if (sent) {
            welcomeEmailQueued = true;
            await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({ welcomeEmailSentAt: now }, { merge: true });
          }
        } catch (e) {
          console.warn("Failed to send welcome email", { uid: userRecord.uid, error: String(e) });
        }

        // Response with tokens and separate cookie setting
        const response = successResponse({
          ok: true,
          uid: userRecord.uid,
          email: userRecord.email,
          customToken,
          verificationEmailQueued,
          welcomeEmailQueued,
          isNewUser: true
        }, 201, ctx.correlationId);

        // Set session cookie
        response.cookies.set("firebaseUserId", userRecord.uid, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: "/",
        });

        return response;

      } catch (error: any) {
        console.error("auth/register (password) error", { error, correlationId: ctx.correlationId });
        if (error.code === "auth/email-already-exists") {
          return errorResponse("An account with this email already exists", 409, { code: "EMAIL_EXISTS" });
        }
        return errorResponse("Registration failed", 500);
      }
    }

    // ---------------------------------------------------------
    // MODE 2: Client-side Sync (UID provided + Authenticated)
    // ---------------------------------------------------------
    if (!ctx.user) {
      return errorResponse("Unauthorized: Missing authentication for sync mode", 401);
    }
    
    // Verify the authenticated user matches the registration request
    const authenticatedUid = (ctx.user as any).userId || (ctx.user as any).id || (ctx.user as any).uid;
    if (bodyUid && authenticatedUid !== bodyUid) {
      return errorResponse("Unauthorized: UID mismatch", 403, { correlationId: ctx.correlationId });
    }
    const targetUid = authenticatedUid; // Use authenticated UID

    try {
      const userRef = db.collection(COLLECTIONS.USERS).doc(targetUid);
      const existingDoc = await userRef.get();

      if (existingDoc.exists) {
        await userRef.set({ lastLoginAt: now, updatedAt: now }, { merge: true });
        return successResponse({ ok: true, uid: targetUid, isNewUser: false }, 200, ctx.correlationId);
      }

      // Create new user document (synced from client auth)
      await userRef.set({
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
      });

      // Email logic for sync mode
      let verificationEmailQueued = false;
      try {
         const tokenRaw = randomBytes(32).toString("hex");
         const tokenHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenRaw));
         const tokenHashHex = Array.from(new Uint8Array(tokenHashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
         const expiresAt = now + 1000 * 60 * 60 * 24; 
         await userRef.set({ emailVerification: { tokenHash: tokenHashHex, issuedAt: now, expiresAt } }, { merge: true });
         
         const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://aroosi.app";
         const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${tokenRaw}`;
         await sendVerificationLinkEmail(email, displayName || "there", verifyUrl);
         verificationEmailQueued = true;
      } catch (e) {
          console.warn("Failed to queue verification email (sync)", { uid: targetUid, error: String(e) });
      }

       let welcomeEmailQueued = false;
       try {
         const sent = await sendWelcomeEmail(email, displayName || "there");
         if (sent) {
           welcomeEmailQueued = true;
           await userRef.set({ welcomeEmailSentAt: now }, { merge: true });
         }
       } catch (e) { console.warn("Failed to send welcome email (sync)", { uid: targetUid, error: String(e) }); }

      return successResponse({
        ok: true,
        uid: targetUid,
        isNewUser: true,
        verificationEmailQueued,
        welcomeEmailQueued,
      }, 200, ctx.correlationId);

    } catch (error) {
      console.error("auth/register (sync) error", { error, correlationId: ctx.correlationId });
      return errorResponse("Registration sync failed", 500);
    }
  },
  {
    requireAuth: false,
    bodySchema: authRegisterSchema,
    rateLimit: { identifier: "auth_register", maxRequests: 10, windowMs: 60000 }
  }
);
