import { ConvexError } from "convex/values";

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function getRole(identity: unknown): string | undefined {
  if (!isObject(identity)) return undefined;
  // Try camelCase and snake_case at top level
  if (
    isObject(identity.publicMetadata) &&
    typeof identity.publicMetadata.role === "string"
  ) {
    return identity.publicMetadata.role;
  }
  if (
    isObject(identity.public_metadata) &&
    typeof identity.public_metadata.role === "string"
  ) {
    return identity.public_metadata.role;
  }
  // Try nested in token.payload
  if (isObject(identity.token) && isObject(identity.token.payload)) {
    const payload = identity.token.payload;
    if (
      isObject(payload.publicMetadata) &&
      typeof payload.publicMetadata.role === "string"
    ) {
      return payload.publicMetadata.role;
    }
    if (
      isObject(payload.public_metadata) &&
      typeof payload.public_metadata.role === "string"
    ) {
      return payload.public_metadata.role;
    }
  }
  return undefined;
}

export function requireAdmin(identity: unknown) {
  const role = getRole(identity);
  console.log("Resolved role:", role);
  if (!identity || role !== "admin") {
    console.error("Admin check failed. Identity:", JSON.stringify(identity));
    throw new ConvexError("Not authorized");
  }
}
