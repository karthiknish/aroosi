import { EventEmitter } from "events";

// Deprecated: in-process pub/sub (single-instance only).
// The app's SSE implementation has been migrated to Firestore-backed events.
// Keep this export temporarily to avoid breaking any legacy imports.
export const eventBus = new EventEmitter();
