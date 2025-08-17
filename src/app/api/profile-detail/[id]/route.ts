import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  try {
    try {
      // Get the user ID from the URL
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return NextResponse.json(
          {
            error: "User ID is required",
            details: "The user ID is missing from the URL",
            path: url.pathname,
          },
          { status: 400 }
        );
      }

      // Auth optional for now (if needed, enforce requireSession)
      let authedUserId: string | null = null;
      const session = await requireSession(req);
      if (!("errorResponse" in session)) authedUserId = session.userId;

      const userDoc = await db.collection("users").doc(id).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          {
            error: "Profile not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }
      const profileData = userDoc.data();

      // Basic shape parity with legacy response
      const responseData = {
        success: true,
        currentUser: authedUserId ? { id: authedUserId } : null,
        profileData: profileData || null,
        isBlocked: false, // TODO: integrate block lookup if required
        isMutualInterest: false, // TODO: integrate interest matching
        sentInterest: [],
        timestamp: new Date().toISOString(),
      } as const;

      return NextResponse.json(responseData, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      });
    } catch (convexError) {
      return NextResponse.json(
        {
          error: "Failed to process request",
          details:
            process.env.NODE_ENV === "development"
              ? convexError instanceof Error
                ? convexError.message
                : String(convexError)
              : undefined,
          code: "CLIENT_ERROR",
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Please check the server logs",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
