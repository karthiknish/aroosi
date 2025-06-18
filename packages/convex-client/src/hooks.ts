// React hooks for Convex integration
import { useMutation, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

// Re-export convex hooks for convenience
export { useMutation, useQuery, useConvexAuth } from "convex/react";

// Custom hooks for common patterns
export function useConvexQuery<T>(
  queryFunction: FunctionReference<"query">,
  args: any = {},
  options: any = {}
) {
  return useQuery(queryFunction, args, options);
}

export function useConvexMutation<T>(mutationFunction: FunctionReference<"mutation">) {
  return useMutation(mutationFunction);
}