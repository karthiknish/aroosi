import { EventEmitter } from "events";

// Shared event emitter for in-process pub/sub (SSE, WebSocket, etc.)
// Keyed by conversationId events.
// Note: This works in a single Next.js instance. In a multi-instance deployment
// you should replace this with Redis/pubsub or another distributed broker.
export const eventBus = new EventEmitter();
