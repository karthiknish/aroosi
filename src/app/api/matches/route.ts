import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { NextRequest } from "next/server";

// GET: Fetch matches for current user
export const GET = withFirebaseAuth(
  async (user: AuthenticatedUser, req: NextRequest) => {
    try {
      // Query matches where user is either user1Id or user2Id and status is "matched"
      const matchesSnap1 = await db
        .collection("matches")
        .where("user1Id", "==", user.id)
        .where("status", "==", "matched")
        .get();
      const matchesSnap2 = await db
        .collection("matches")
        .where("user2Id", "==", user.id)
        .where("status", "==", "matched")
        .get();
      const allMatches = [...matchesSnap1.docs, ...matchesSnap2.docs];

      // For each match, get the other user's profile
      const results = await Promise.all(
        allMatches.map(
          async (
            doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
          ) => {
            const match = doc.data();
            const otherUserId =
              match.user1Id === user.id ? match.user2Id : match.user1Id;
            // Fetch profile from users collection
            const userDoc = await db.collection("users").doc(otherUserId).get();
            const profile = userDoc.exists ? userDoc.data() : {};
            return {
              userId: otherUserId,
              fullName: profile.fullName ?? null,
              profileImageUrls: profile.profileImageUrls ?? [],
              createdAt: match.createdAt ?? Date.now(),
            };
          }
        )
      );
      return successResponse(results);
    } catch (e) {
      console.error("Firestore matches GET error", e);
      return errorResponse("Failed to fetch matches", 500);
    }
  }
);
