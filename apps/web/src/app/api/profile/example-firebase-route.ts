import { NextRequest } from "next/server";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

// Example of a protected API route using Firebase authentication
export async function GET(request: NextRequest) {
  return withFirebaseAuth(async (user: AuthenticatedUser, _req, _ctx) => {
    try {
      // Example: Get user's profile from Firestore
  const userDoc = await db.collection("users").doc(user.id).get();
      const profileData = userDoc.data();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: profileData,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error fetching profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request, {});
}

// Example of a protected API route for updating user profile
export async function PUT(request: NextRequest) {
  return withFirebaseAuth(async (user: AuthenticatedUser, req, _ctx) => {
    try {
      const updates = await req.json();
      
      // Example: Update user's profile in Firestore
  await db.collection("users").doc(user.id).update({
        ...updates,
        updatedAt: Date.now()
      });
      
      return new Response(
        JSON.stringify({ success: true, message: "Profile updated successfully" }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request, {});
}