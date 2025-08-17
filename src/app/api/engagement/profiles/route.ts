import { NextRequest } from "next/server";
import { z } from "zod";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

const schema = z.object({ userIds: z.array(z.string().min(1)).min(1).max(200) });

export const POST = withFirebaseAuth(async (_user, req: NextRequest) => {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid)
    return applySecurityHeaders(
      errorResponse(sec.error ?? "Invalid request", 400)
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
      })
    );
  }
  const { userIds } = parsed.data;
  try {
    const results: Array<{
      userId: string;
      fullName?: string | null;
      city?: string | null;
      imageUrl?: string | null;
    }> = [];
    for (const uid of userIds) {
      try {
        const doc = await db.collection("users").doc(uid).get();
        if (!doc.exists) {
          continue;
        }
        const data = doc.data() as any;
        results.push({
          userId: uid,
          fullName: data.fullName || null,
          city: data.city || null,
          imageUrl:
            Array.isArray(data.profileImageUrls) &&
            data.profileImageUrls.length > 0
              ? data.profileImageUrls[0]
              : null,
        });
      } catch {
        /* ignore */
      }
    }
    return applySecurityHeaders(successResponse(results));
  } catch (e: any) {
    return applySecurityHeaders(errorResponse(e?.message || "Failed", 500));
  }
});


