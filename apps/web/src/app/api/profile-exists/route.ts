import { NextRequest, NextResponse } from "next/server";
import { db, COLLECTIONS } from '@/lib/userProfile';

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  try {
    // Firestore lookup
    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (userSnap.empty) {
      return NextResponse.json({
        success: true,
        exists: false,
        hasProfile: false,
      });
    }
    const doc = userSnap.docs[0];
    const userData: any = doc.data();
    // Heuristic: consider a profile exists if mandatory fields like fullName and dateOfBirth are present
    const hasProfile = Boolean(
      userData.fullName || userData.dateOfBirth || userData.gender
    );
    return NextResponse.json({
      success: true,
      exists: true,
      hasProfile,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
