import { NextRequest } from "next/server";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import type {
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const results: any = {};

    // Check total users
    const allUsers = await db.collection(COLLECTIONS.USERS).limit(10).get();
    results.totalUsers = allUsers.size;
    results.sampleUsers = allUsers.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          id: doc.id,
          gender: data.gender,
          fullName: data.fullName,
          banned: data.banned,
          hiddenFromSearch: data.hiddenFromSearch,
          age: data.age,
          city: data.city,
        };
      }
    );

    // Onboarding flag removed; retain placeholder metric via basic profile count
    results.onboardingCompleteCount = results.totalUsers;

    // Check female users
    const femaleUsers = await db
      .collection(COLLECTIONS.USERS)
      .where("gender", "==", "female")
      .limit(10)
      .get();
    results.femaleUsersCount = femaleUsers.size;

    // Female onboarded metric collapses to female total now
    results.femaleOnboardedCount = results.femaleUsersCount;

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
