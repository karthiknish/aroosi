// Consolidated Firebase User/Profile API Routes
// Replaces separate user and profile APIs with a unified system

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  getUserProfileByUid,
  createOrUpdateUserProfile,
  updateUserProfile,
  verifyFirebaseIdToken,
  UserDocument
} from "@/lib/userProfile";
import { searchUsers } from '@/lib/userProfile/search';
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";

// GET /api/user/profile - Get current user's profile
export async function GET(request: NextRequest) {
  return withFirebaseAuth(async (user) => {
    try {
      const userProfile = await getUserProfileByUid(user.id);
      
      if (!userProfile) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "User profile not found" 
          }),
          { 
            status: 404, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: userProfile 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to fetch user profile" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request);
}

// PUT /api/user/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  return withFirebaseAuth(async (user) => {
    try {
      const updates = await request.json();
      
      // Remove protected fields that shouldn't be updated by users
      const protectedFields = [
        'id', 'uid', 'email', 'emailVerified', 'createdAt', 'role', 
        'banned', 'banReason', 'banExpiresAt', 'disabled',
        'subscriptionPlan', 'subscriptionExpiresAt', 'subscriptionFeatures',
        'boostsRemaining', 'boostedUntil', 'hasSpotlightBadge', 
        'spotlightBadgeExpiresAt', 'totalProfileViews', 'totalMessagesSent',
        'totalMessagesReceived', 'totalLikesGiven', 'totalLikesReceived',
        'totalMatches', 'loginCount', 'lastLoginAt', 'referredBy', 
        'referredUsers', 'referralCode'
      ];
      
      protectedFields.forEach(field => {
        if (field in updates) {
          delete updates[field];
        }
      });
      
      const updatedProfile = await updateUserProfile(user.id, updates);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedProfile 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error updating user profile:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to update user profile" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request);
}

// POST /api/user/profile - Create or fully update user profile
export async function POST(request: NextRequest) {
  return withFirebaseAuth(async (user) => {
    try {
      const profileData = await request.json();
      
      // Ensure required fields are present
      if (!profileData.email) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Email is required" 
          }),
          { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
      
      const userProfile = await createOrUpdateUserProfile(
        user.id, 
        profileData.email, 
        profileData
      );
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: userProfile 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error creating user profile:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create user profile" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request);
}

// DELETE /api/user/profile - Delete user profile (soft delete)
export async function DELETE(request: NextRequest) {
  return withFirebaseAuth(async (user) => {
    try {
      // Instead of hard delete, mark as deleted
      await updateUserProfile(user.id, {
        disabled: true,
        updatedAt: Date.now()
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User profile deleted successfully" 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error deleting user profile:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to delete user profile" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
  })(request);
}
