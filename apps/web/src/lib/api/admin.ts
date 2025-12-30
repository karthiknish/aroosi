import { ApiContext, errorResponse } from "@/lib/api/handler";

export type AdminRole = "admin" | "moderator";

export function requireAnyRole(
  ctx: ApiContext,
  roles: readonly AdminRole[]
): { ok: true } | { ok: false; response: Response } {
  const role = (ctx.user as any)?.role || "user";
  if (roles.includes(role)) return { ok: true };

  return {
    ok: false,
    response: errorResponse("Admin privileges required", 403, {
      correlationId: ctx.correlationId,
      code: "FORBIDDEN",
      details: { requiredRoles: roles, role },
    }),
  };
}

export function requireAdmin(ctx: ApiContext) {
  return requireAnyRole(ctx, ["admin"] as const);
}
