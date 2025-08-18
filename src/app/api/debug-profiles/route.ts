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
        isOnboardingComplete: data.isOnboardingComplete,
        fullName: data.fullName,
        banned: data.banned,
        hiddenFromSearch: data.hiddenFromSearch,
        age: data.age,
        city: data.city,
      };
    }
  );
    
    // Check onboarding complete users
    const onboardingComplete = await db.collection(COLLECTIONS.USERS)
      .where('isOnboardingComplete', '==', true)
      .limit(10)
      .get();
    results.onboardingCompleteCount = onboardingComplete.size;
    
    // Check female users
    const femaleUsers = await db.collection(COLLECTIONS.USERS)
      .where('gender', '==', 'female')
      .limit(10)
      .get();
    results.femaleUsersCount = femaleUsers.size;
    
    // Check female + onboarding complete
    try {
      const femaleOnboarded = await db.collection(COLLECTIONS.USERS)
        .where('isOnboardingComplete', '==', true)
        .where('gender', '==', 'female')
        .limit(10)
        .get();
      results.femaleOnboardedCount = femaleOnboarded.size;
  results.femaleOnboardedUsers = femaleOnboarded.docs.map(
    (doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      return {
        id: doc.id,
        fullName: data.fullName,
        age: data.age,
        city: data.city,
        banned: data.banned,
        hiddenFromSearch: data.hiddenFromSearch,
      };
    }
  );
    } catch (error) {
      results.femaleOnboardedError = (error as Error).message;
    }
    
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" }
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
