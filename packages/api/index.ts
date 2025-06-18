// Shared API/types package
// Re-export existing web types for now so both web & mobile can import from "@api/..." without path changes.

export * from "@/types/profile";
export * from "@/types/image";
export * from "@/types/auth";

// TODO: Move reusable helpers (apiResponse, fetch wrappers, etc.) into this package.
