import { requireAuth } from "@/lib/auth/requireAuth";
import { NextRequest } from "next/server";

/**
 * Ensures the current request is made by an authenticated admin user (role === 'admin').
 * Returns the user object on success; throws an Error with status/code metadata otherwise.
 */
export async function ensureAdmin(req?: NextRequest) {
  // requireAuth has fallback for next/headers cookies if req is missing
  const user = await requireAuth(req as any).catch(err => {
    // Standardize error message for admin flow
    const e = new Error(err.message || "Authentication required");
    (e as any).status = err.status || 401;
    (e as any).code = err.code || "UNAUTHORIZED";
    throw e;
  });

  if (user.role !== "admin") {
    const err = new Error("Admin privileges required");
    (err as any).status = 403;
    (err as any).code = "FORBIDDEN";
    throw err;
  }
  
  return user;
}

/**
 * Convenience wrapper to enforce admin access around a handler.
 */
export function withAdmin<T>(handler: (adminUser: Awaited<ReturnType<typeof requireAuth>>) => Promise<T>) {
  return async (req: NextRequest) => {
    const user = await ensureAdmin(req);
    return handler(user);
  };
}
