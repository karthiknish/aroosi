import type { Id } from '@aroosi/shared-types';

// Utility functions for working with Convex data
export function isValidConvexId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.length > 0;
}

export function createConvexId<T extends string>(tableName: T, id: string): Id<T> {
  return id as Id<T>;
}

export function extractConvexId(id: Id<any>): string {
  return id;
}

// Error handling utilities
export function isConvexError(error: any): boolean {
  return error && typeof error.message === 'string' && error.data;
}

export function formatConvexError(error: any): string {
  if (isConvexError(error)) {
    return error.message;
  }
  return error?.message || 'An unexpected error occurred';
}