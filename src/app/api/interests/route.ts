import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

function getTokenFromRequest(req: NextRequest): {
  token: string | null;
  error?: string;
} {
  try {
    const auth = req.headers.get("authorization");
    
    if (!auth) {
      console.log("[API] No authorization header found");
      return { token: null, error: "No authorization header" };
    }

    const [type, token] = auth.split(" ");

    if (type !== "Bearer") {
      console.log("[API] Invalid token type. Expected Bearer token");
      return { token: null, error: "Invalid token type" };
    }

    if (!token) {
      console.log("[API] No token provided after Bearer");
      return { token: null, error: "No token provided" };
    }
    
    return { token };
  } catch (error) {
    console.error("[API] Error extracting token:", error);
    return {
      token: null,
      error: error instanceof Error ? error.message : "Failed to process token",
    };
  }
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  try {
    // Validate token
    const { token, error: tokenError } = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          details: tokenError,
        },
        { status: 401 }
      );
    }

    // Parse request body
    let body: Partial<InterestRequest>;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: e instanceof Error ? e.message : "Unknown error",
        },
        { status: 400 }
      );
    }
    
    // Validate required fields
    const { fromUserId, toUserId } = body;
    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing user IDs",
        },
        { status: 400 }
      );
    }
    
    // Initialize Convex client
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
        },
        { status: 500 }
      );
    }
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    convex.setAuth(token);
    
    try {
      const result = await convex.mutation(
        action === "send"
          ? api.interests.sendInterest
          : api.interests.removeInterest,
        {
          fromUserId: fromUserId as Id<"users">,
          toUserId: toUserId as Id<"users">,
        }
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );
    } catch (convexErr) {
      const error = convexErr as Error;
      const isAuthError =
        error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication");

      return NextResponse.json(
        {
          success: false,
          error: isAuthError
            ? "Authentication failed"
            : `Failed to ${action} interest`,
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: isAuthError ? 401 : 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Please check the server logs",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Get userId from query string
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  // Auth
    const { token, error: tokenError } = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication failed", details: tokenError },
        { status: 401 }
      );
    }
    
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  try {
    // Query interests sent by this user
    const result = await convex.query(api.interests.getSentInterests, {
      userId: userId as Id<"users">,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sent interests",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleInterestAction(req, "send");
}

export async function DELETE(req: NextRequest) {
  return handleInterestAction(req, "remove");
}
