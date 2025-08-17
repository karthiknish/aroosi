// Utility functions for protecting API routes with Firebase authentication

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyFirebaseIdToken, getFirebaseUser } from "@/lib/userProfile";

// Type for the authenticated user
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: number;
  fullName?: string;
  profile: {
    id: string;
    fullName?: string;
    isOnboardingComplete: boolean;
  } | null;
}

// Utility to get the authenticated user from Firebase token
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    // Get the Firebase ID token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("firebaseAuthToken")?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify the Firebase ID token
    const decodedToken = await verifyFirebaseIdToken(token);
    const userId = decodedToken.uid;
    
    if (!userId) {
      return null;
    }
    
    // Get the user data from Firestore
  const userData: any = await getFirebaseUser(userId);
  if (!userData) {
      return null;
    }
    
    // Return user data with profile
    return {
      id: userId,
      email: (userData.email as string) || "",
      role: (userData.role as string) || "user",
      emailVerified: !!userData.emailVerified,
      createdAt: (userData.createdAt as number) || Date.now(),
      fullName:
        (userData.fullName as string) ||
        (userData.displayName as string) ||
        undefined,
      profile: userData
        ? {
            id: userId,
            fullName: (userData.fullName as string) || undefined,
            isOnboardingComplete: Boolean(
              (userData.isOnboardingComplete as boolean) ?? false
            ),
          }
        : null,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

// Utility to protect API routes with Firebase authentication
export async function withFirebaseAuth(handler: (user: AuthenticatedUser, request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or missing authentication token" }),
          { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
      
      return handler(user, request);
    } catch (error) {
      console.error("Error in withFirebaseAuth:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  };
}