import { 
  createApiHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from '@/lib/userProfile';

export const GET = createApiHandler(async (ctx: ApiContext) => {
  const { request, correlationId } = ctx;
  const email = new URL(request.url).searchParams.get("email");
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Invalid email", 400, { correlationId });
  }

  try {
    // Firestore lookup
    const userSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
      
    if (userSnap.empty) {
      return successResponse({
        exists: false,
        hasProfile: false,
      }, 200, correlationId);
    }
    
    const doc = userSnap.docs[0];
    const userData: any = doc.data();
    
    // Heuristic: consider a profile exists if mandatory fields like fullName and dateOfBirth are present
    const hasProfile = Boolean(
      userData.fullName || userData.dateOfBirth || userData.gender
    );
    
    return successResponse({
      exists: true,
      hasProfile,
    }, 200, correlationId);
  } catch (error) {
    console.error("[profile-exists] error", { correlationId, error });
    return errorResponse("Failed to check profile existence", 500, { correlationId });
  }
});
