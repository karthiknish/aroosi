export function getAuthToken(req: import("next/server").NextRequest): {
  token: string | null;
  error?: string;
} {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) {
    // Fallback for EventSource which can't send headers: look in query param
    // WARNING: This is less secure and should be used only for SSE
    const tokenFromQuery = req.nextUrl?.searchParams.get("token");
    if (tokenFromQuery) {
      // Log token usage from query for security monitoring
      console.warn('Token accessed from query parameter - less secure method', {
        url: req.url,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return { token: tokenFromQuery };
    }
    return { token: null, error: "No authorization header" };
  }
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token)
    return { token: null, error: "Invalid authorization header" };
  return { token };
}

// Decode a JWT and extract the role from JWT public metadata
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
    interface JwtPayload {
      publicMetadata?: { role?: string };
      public_metadata?: { role?: string };
      [key: string]: unknown;
    }
    const payload = JSON.parse(json) as JwtPayload;
    // JWT puts role in publicMetadata or public_metadata
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

export function extractUserIdFromToken(token: string): string | null {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return null;

    // Base64url decode
    const padded = payloadPart
      .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), "=")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(json);

    // JWT typically puts user ID in 'sub' field
    return payload.sub || payload.userId || null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}

export function isAdminToken(token: string): boolean {
  return extractRoleFromToken(token) === "admin";
}

export function requireAdminToken(
  req: import("next/server").NextRequest
): { token: string; userId?: string } | { errorResponse: Response } {
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
  
  // Validate user ID first
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "Invalid token payload",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  
  if (!isAdminToken(token)) {
    // Log unauthorized admin access attempt
    console.warn('Unauthorized admin access attempt', {
      userId,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      url: req.url
    });
    
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: "Admin privileges required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  
  return { token, userId };
}

export function requireUserToken(
  req: import("next/server").NextRequest
): { token: string; userId?: string } | { errorResponse: Response } {
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
  
  // Extract and validate user ID
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: "Invalid token payload",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  
  return { token, userId };
}
