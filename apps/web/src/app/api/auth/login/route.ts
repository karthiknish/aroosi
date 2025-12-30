import { 
  createApiHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { adminAuth } from "@/lib/firebaseAdmin";

// Sign in with email and password using Firebase
export const POST = createApiHandler(async (ctx: ApiContext, body: any) => {
  const { correlationId } = ctx;
  const { email, password } = body || {};
  
  if (!email || !password) {
    return errorResponse("Missing email or password", 400, { 
      correlationId, 
      code: "BAD_REQUEST" 
    });
  }

  try {
    // Sign in with Firebase Admin SDK
    // Note: Admin SDK doesn't support signInWithEmailAndPassword directly? 
    // Wait, the original signin code used adminAuth.getUserByEmail then created a custom token?
    // Let's verify the original logic. 
    // Original: 
    // const userRecord = await adminAuth.getUserByEmail(email);
    // const customToken = await adminAuth.createCustomToken(userRecord.uid);
    //
    // WAIT. This logic DOES NOT VERIFY PASSWORD. It allows anyone knowing an email to log in!
    // This is a CRITICAL SECURITY VULNERABILITY in the original signin code.
    // adminAuth.getUserByEmail(email) just fetches user data. It doesn't check password.
    
    // I MUST fix this. But this is a server-side route.
    // To verify password server-side with Firebase, one usually uses the REST API or client SDK.
    // The Admin SDK cannot verify passwords.
    // If the original code was: 
    // const userRecord = await adminAuth.getUserByEmail(email);
    // ...
    // It was definitively insecure unless I missed something huge. 
    
    // Let's look at `apps/mobile/src/services/api/auth.ts`. It uses `auth().signInWithEmailAndPassword`.
    // The mobile app does it client side then calls backend? No, mobile calls backend for `register` but handles login itself?
    // `apps/mobile/src/services/api/auth.ts` -> `loginWithEmail` -> `auth().signInWithEmailAndPassword` -> returns user.
    // It does NOT call `/api/auth/signin` or `/api/auth/login`.
    
    // Web client `apps/web/src/lib/auth/client.ts` calls `/api/auth/signin`.
    // If `/api/auth/signin` is insecure, we have a big problem.
    
    // Let me check `signin/route.ts` again very carefully.
    // "const userRecord = await adminAuth.getUserByEmail(email);"
    // "const customToken = await adminAuth.createCustomToken(userRecord.uid);"
    // YES, IT IS INSECURE. It blindly yields a token for any email.
    
    // Changing strategy:
    // I cannot perform secure password login purely with Admin SDK.
    // I need to use the Identity Toolkit API (REST) to verify password.
    // OR require the client to sign in with Firebase SDK directly (like mobile does).
    
    // However, for this task "Consolidate duplicates", I should first consolidate, then fix?
    // Or fix while consolidating?
    // Fixing is critical.
    
    // I will use `firebase/auth` (client SDK) on the server? No, redundant.
    // I will implement the REST API call to verify password.
    
    // Actually, check `apps/web/src/lib/firebase.ts` (client sdk) usage. 
    // `signin` route is server-side.
    
    // Let's verify password using Google Identity Toolkit REST API.
    // https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=[API_KEY]
    
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
       console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
       return errorResponse("Server configuration error", 500, { correlationId });
    }
    
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    
    const verifyData = await verifyRes.json();
    
    if (!verifyRes.ok) {
       // Map error codes
       const msg = verifyData.error?.message || "Login failed";
       if (msg.includes("EMAIL_NOT_FOUND")) {
          return errorResponse("No account found with this email address", 404, { correlationId, code: "ACCOUNT_NOT_FOUND" });
       }
       if (msg.includes("INVALID_PASSWORD")) {
          return errorResponse("Invalid password", 401, { correlationId, code: "INVALID_PASSWORD" });
       }
       if (msg.includes("USER_DISABLED")) {
          return errorResponse("Account disabled", 403, { correlationId, code: "ACCOUNT_DISABLED" });
       }
       throw new Error(msg);
    }
    
    // Password verified. Now we can proceed.
    // verifyData.localId is the uid.
    const uid = verifyData.localId;
    
    // Get full user record from Admin SDK for extra data if needed, or just use what we have.
    const user = await adminAuth.getUser(uid);
    
    const customToken = await adminAuth.createCustomToken(uid);
    
    const response = successResponse({ 
      uid: user.uid,
      email: user.email,
      customToken: customToken,
      idToken: verifyData.idToken, // Also return the ID token from REST if helpful
      refreshToken: verifyData.refreshToken
    }, 200, correlationId);
    
    response.cookies.set("firebaseUserId", user.uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    
    return response;

  } catch (firebaseError: any) {
    console.error("[login] error", { correlationId, firebaseError });
    return errorResponse("Sign in failed", 401, { 
      correlationId, 
      code: "INVALID_CREDENTIALS" ,
      details: firebaseError.message
    });
  }
});
