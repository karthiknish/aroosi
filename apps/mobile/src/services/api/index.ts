/**
 * API Services - Barrel Export
 */

// Base client
export * from './client';

// Feature APIs
export * from './auth';
export * from './appleAuth';
export * from './profile';
export * from './matches';
export * from './messages';
export * from './recommendations';
export * from './subscription';
export * from './icebreakers';
export * from './notifications';
export * from './engagement';
export * from './interests';
export * from './profileViewers';
// Note: report.ts exports overlap with matches.ts - use direct import if needed

