import { ConvexError } from "convex/values";

export function requireAdmin(identity: any) {
  const role =
    identity?.public_metadata?.role ||
    identity?.token?.payload?.public_metadata?.role;

  console.log("Resolved role:", role);

  if (!identity || role !== "admin") {
    console.error("Admin check failed. Identity:", JSON.stringify(identity));
    throw new ConvexError("Not authorized");
  }
}
