import { NextRequest } from "next/server";
import { verifyJWT, extractTokenFromHeader } from "./jwt";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export async function authenticateApiRequest(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get("authorization");
    let token = extractTokenFromHeader(authHeader);

    // If no Authorization header, try to get from cookie
    if (!token) {
      token = request.cookies.get("auth-token")?.value || null;
    }

    // If still no token, try from middleware headers (set by middleware)
    if (!token) {
      const userId = request.headers.get("x-user-id");
      const email = request.headers.get("x-user-email");
      const role = request.headers.get("x-user-role");

      if (userId && email) {
        return {
          userId,
          email,
          role: role || "user",
        };
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT token
    const payload = await verifyJWT(token);

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role || "user",
    };
  } catch (error) {
    console.error("API authentication error:", error);
    return null;
  }
}

export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>,
) {
  return async (request: NextRequest) => {
    const user = await authenticateApiRequest(request);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return handler(request, user);
  };
}

export function requireAdmin(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>,
) {
  return async (request: NextRequest) => {
    const user = await authenticateApiRequest(request);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(request, user);
  };
}
