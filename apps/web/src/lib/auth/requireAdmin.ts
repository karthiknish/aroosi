import { getAuthenticatedUser } from "@/lib/auth/firebaseAuth";

/**
 * Ensures the current request is made by an authenticated admin user (role === 'admin').
 * Returns the user object on success; throws an Error with status/code metadata otherwise.
 */
export async function ensureAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) {
    const err = new Error("Authentication required");
    (err as any).status = 401;
    (err as any).code = "UNAUTHORIZED";
    throw err;
  }
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
export function withAdmin<T>(handler: (adminUser: Awaited<ReturnType<typeof getAuthenticatedUser>>) => Promise<T>) {
  return async () => {
    const user = await ensureAdmin();
    return handler(user);
  };
}
