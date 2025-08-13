import { User, Organization, Session } from "@clerk/nextjs/server";
import { currentUser, auth } from "@clerk/nextjs/server";

/**
 * Get the current authenticated user from Clerk
 * @returns Promise with User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await currentUser();
    return user;
  } catch (error) {
    console.error("[ClerkAPI] Error getting current user:", error);
    return null;
  }
}

/**
 * Get the current session from Clerk
 * @returns Promise with session data or null if not authenticated
 */
export async function getCurrentSession(): Promise<{
  user: User | null;
  session: Session | null;
  organization: Organization | null;
} | null> {
  try {
    const { userId, sessionId, orgId } = await auth();
    
    if (!userId || !sessionId) {
      return null;
    }
    
    const user = await currentUser();
    
    // Note: Organization data would need to be fetched separately if needed
    // This is a simplified version that returns basic session info
    
    return {
      user,
      session: null, // Session object not directly available in server context
      organization: null, // Organization object not directly available in server context
    };
  } catch (error) {
    console.error("[ClerkAPI] Error getting current session:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns Promise with boolean indicating authentication status
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await currentUser();
    return !!user;
  } catch (error) {
    console.error("[ClerkAPI] Error checking authentication status:", error);
    return false;
  }
}

/**
 * Get user's email address
 * @returns Promise with user's email or null if not authenticated
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    // Get primary email address
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  } catch (error) {
    console.error("[ClerkAPI] Error getting user email:", error);
    return null;
  }
}

/**
 * Get user's full name
 * @returns Promise with user's full name or null if not authenticated
 */
export async function getUserFullName(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.fullName || user.firstName || null;
  } catch (error) {
    console.error("[ClerkAPI] Error getting user full name:", error);
    return null;
  }
}

/**
 * Get user's profile image URL
 * @returns Promise with user's profile image URL or null if not authenticated
 */
export async function getUserProfileImageUrl(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.imageUrl || null;
  } catch (error) {
    console.error("[ClerkAPI] Error getting user profile image URL:", error);
    return null;
  }
}

/**
 * Get user's phone number
 * @returns Promise with user's phone number or null if not authenticated
 */
export async function getUserPhoneNumber(): Promise<string | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    // Get primary phone number
    const primaryPhone = user.phoneNumbers.find(
      (phone) => phone.id === user.primaryPhoneNumberId
    );
    
    return primaryPhone?.phoneNumber || null;
  } catch (error) {
    console.error("[ClerkAPI] Error getting user phone number:", error);
    return null;
  }
}

/**
 * Get user's external accounts (Google, etc.)
 * @returns Promise with user's external accounts or empty array if not authenticated
 */
export async function getUserExternalAccounts(): Promise<any[]> {
  try {
    const user = await currentUser();
    if (!user) return [];
    
    return user.externalAccounts || [];
  } catch (error) {
    console.error("[ClerkAPI] Error getting user external accounts:", error);
    return [];
  }
}

/**
 * Get user's unsafe metadata
 * @returns Promise with user's unsafe metadata or null if not authenticated
 */
export async function getUserUnsafeMetadata(): Promise<any> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.unsafeMetadata || {};
  } catch (error) {
    console.error("[ClerkAPI] Error getting user unsafe metadata:", error);
    return {};
  }
}

/**
 * Get user's public metadata
 * @returns Promise with user's public metadata or null if not authenticated
 */
export async function getUserPublicMetadata(): Promise<any> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.publicMetadata || {};
  } catch (error) {
    console.error("[ClerkAPI] Error getting user public metadata:", error);
    return {};
  }
}

/**
 * Get user's private metadata (server-side only)
 * @returns Promise with user's private metadata or null if not authenticated
 */
export async function getUserPrivateMetadata(): Promise<any> {
  try {
    const user = await currentUser();
    if (!user) return null;
    
    return user.privateMetadata || {};
  } catch (error) {
    console.error("[ClerkAPI] Error getting user private metadata:", error);
    return {};
  }
}