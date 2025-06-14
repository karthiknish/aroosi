export function getAuthToken(req: import("next/server").NextRequest): {
  token: string | null;
  error?: string;
} {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return { token: null, error: "No authorization header" };
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token)
    return { token: null, error: "Invalid authorization header" };
  return { token };
}

// Decode a JWT and extract the role from Clerk public metadata
export function extractRoleFromToken(token: string): string | undefined {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return undefined;
    // base64url decode
    const padded = payloadPart
      .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), "=")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    interface ClerkJwtPayload {
      publicMetadata?: { role?: string };
      public_metadata?: { role?: string };
      [key: string]: unknown;
    }
    const payload = JSON.parse(json) as ClerkJwtPayload;
    // Clerk puts role in publicMetadata or public_metadata
    if (
      payload.publicMetadata &&
      typeof payload.publicMetadata.role === "string"
    ) {
      return payload.publicMetadata.role;
    }
    if (
      payload.public_metadata &&
      typeof payload.public_metadata.role === "string"
    ) {
      return payload.public_metadata.role;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function isAdminToken(token: string): boolean {
  return extractRoleFromToken(token) === "admin";
}

export function requireAdminToken(
  req: import("next/server").NextRequest
): { token: string } | { errorResponse: Response } {
  const { token, error } = getAuthToken(req);
  if (!token) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: error || "Authentication failed",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  if (!isAdminToken(token)) {
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: "Admin privileges required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { token };
}

export function requireUserToken(
  req: import("next/server").NextRequest
): { token: string } | { errorResponse: Response } {
  const { token, error } = getAuthToken(req);
  if (!token) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: error || "Authentication failed",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { token };
}
