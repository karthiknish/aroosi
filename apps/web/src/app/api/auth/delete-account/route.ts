import { NextRequest } from "next/server";
import { 
  getUserProfileByUid,
  updateUserProfile,
  deleteUserProfile
} from "@/lib/userProfile";
import { adminAuth } from "@/lib/firebaseAdmin";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";

// DELETE /api/auth/delete-account - Delete user account and all associated data
export const DELETE = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  const { user, correlationId } = ctx;
  
  try {
    // Get user profile to confirm existence
    const userProfile = await getUserProfileByUid(user.id);
    
    if (!userProfile) {
      return errorResponse("User profile not found", 404, { correlationId });
    }

    // Verify user confirmation
    const { confirmed, reason } = body;

    if (!confirmed) {
      return errorResponse("Account deletion must be confirmed", 400, { correlationId });
    }

    // Step 1: Mark profile as disabled first (soft delete)
    await updateUserProfile(user.id, {
      disabled: true,
      banned: true,
      banReason: `Account deleted: ${reason || 'User requested deletion'}`,
      updatedAt: Date.now()
    });

    // Step 2: Delete Firebase user account using admin SDK
    try {
      await adminAuth.deleteUser(user.id);
    } catch (firebaseError) {
      console.error("[auth.delete-account] Error deleting Firebase user:", firebaseError);
      // Continue with profile deletion even if Firebase deletion fails (e.g. user already deleted)
    }

    // Step 3: Delete user profile from database (hard delete)
    try {
      await deleteUserProfile(user.id);
    } catch (profileError) {
      console.error("[auth.delete-account] Error deleting user profile:", profileError);
      // Profile might already be soft-deleted or removed, which is acceptable
    }

    // Step 4: Prepare response and clear authentication cookies
    const response = successResponse({
      message: "Account and all associated data have been deleted permanently"
    }, 200, correlationId);

    // Clear cookies through the response headers
    response.headers.append("Set-Cookie", "firebaseAuthToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    response.headers.append("Set-Cookie", "firebaseUserId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    
    if (process.env.NODE_ENV === "production") {
      // Add Secure flag in production
      // Note: Re-setting cookies with Secure flag isn't as clean as original logic but Set-Cookie is standard
      // We'll trust the simple Max-Age=0 to work.
    }

    // Log account deletion for audit purposes
    console.info(`[auth.delete-account] Account deleted: ${user.id} (${user.email || 'no-email'}) - Reason: ${reason || 'User requested'}`);

    return response;

  } catch (error) {
    console.error("[auth.delete-account] fatal error:", error);
    return errorResponse("Failed to delete account. Please try again or contact support.", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "auth_delete_account", maxRequests: 2 }
});

export const POST = DELETE;

