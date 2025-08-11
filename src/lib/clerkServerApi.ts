import { auth, currentUser } from "@clerk/nextjs/server";
import { User, Organization, Session } from "@clerk/nextjs/server";

/**
 * Server-side utility functions for Clerk authentication
 * These should only be used in server components, API routes, or server actions
 */

/**
 * Get the current authenticated user from Clerk (server-side)
 * @returns Promise with User object or null if not authenticated
 */
export async function getCurrentUserServer(): Promise<User | null> {
  try {
    const user = await currentUser();
    return user;
  } catch (error) {
    console.error("[ClerkServerAPI] Error getting current user:", error);
    return null;
  }
}

/**
 * Get authentication state from Clerk (server-side)
 * @returns Promise with authentication data
 */
export async function getAuthStateServer(): Promise<{
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  user: User | null;
}> {
  try {
    const { userId, sessionId, orgId } = await auth();
    const user = userId ? await currentUser() : null;
    
    return {
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      orgId: orgId ?? null,
      user,
    };
  } catch (error) {
    console.error("[ClerkServerAPI] Error getting auth state:", error);
    return {
      userId: null,
      sessionId: null,
      orgId: null,
      user: null,
    };
  }
}

/**
 * Check if user is authenticated (server-side)
 * @returns Promise with boolean indicating authentication status
 */
export async function isAuthenticatedServer(): Promise<boolean> {
  try {
    const { userId } = await auth();
    return !!userId;
  } catch (error) {
    console.error("[ClerkServerAPI] Error checking authentication status:", error);
    return false;
  }
}

/**
 * Get user's email address (server-side)
 * @returns Promise with user's email or null if not authenticated
 */
export async function getUserEmailServer(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    // Get primary email address
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  } catch (error) {
    console.error("[ClerkServerAPI] Error getting user email:", error);
    return null;
  }
}

/**
 * Get user's full name (server-side)
 * @returns Promise with user's full name or null if not authenticated
 */
export async function getUserFullNameServer(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null;
  } catch (error) {
    console.error("[ClerkServerAPI] Error getting user full name:", error);
    return null;
  }
}

/**
 * Require authentication for server-side operations
 * Throws an error if user is not authenticated
 */
export async function requireAuthServer(): Promise<User> {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}

/**
 * Require specific permissions for server-side operations
 * Throws an error if user doesn't have required permissions
 */
export async function requirePermissionServer(permission: string): Promise<User> {
  const { has } = await auth();
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  if (!has({ permission })) {
    throw new Error("Insufficient permissions");
  }
  
  return user;
}

/**
 * Get organization context (server-side)
 * @returns Promise with organization data or null
 */
export async function getOrganizationServer(): Promise<Organization | null> {
  // Organization data would need to be fetched through other means
  // as the server-side auth doesn't directly expose organization data
  return null;
}

/**
 * Get session context (server-side)
 * @returns Promise with session data or null
 */
export async function getSessionServer(): Promise<Session | null> {
  // Session data would need to be fetched through other means
  // as the server-side auth doesn't directly expose session data
  return null;
}