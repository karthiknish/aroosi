import type { NextRequest } from "next/server";

export type AuthenticatedUser = {
  id: string;
  uid: string;
  userId: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  isProfileComplete?: boolean;
  banned?: boolean;
};

type GetAuthenticatedUser = (req: NextRequest) => Promise<AuthenticatedUser>;

async function defaultGetAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser> {
  // Dynamic import keeps this module safe for client bundles that only use types.
  const { requireAuth } = await import("@/lib/auth/requireAuth");
  const payload = await requireAuth(req);

  const id = payload.userId;
  return {
    id,
    uid: id,
    userId: id,
    email: payload.email,
    role: payload.role,
    isAdmin: payload.role === "admin",
    isProfileComplete: payload.isProfileComplete === true,
    banned: payload.banned === true,
  };
}

let getAuthenticatedUserImpl: GetAuthenticatedUser = defaultGetAuthenticatedUser;

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser> {
  return getAuthenticatedUserImpl(req);
}

export function __setGetAuthenticatedUserForTests(fn: GetAuthenticatedUser | null) {
  getAuthenticatedUserImpl = fn ?? defaultGetAuthenticatedUser;
}
