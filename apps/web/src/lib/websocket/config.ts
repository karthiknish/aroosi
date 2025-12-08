export const WEBSOCKET_CONFIG = {
  // Vercel Edge Function endpoint
  ENDPOINT:
    process.env.NODE_ENV === "production"
      ? "wss://aroosi.vercel.app/api/websocket"
      : "ws://localhost:3000/api/websocket",

  // Connection settings
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,

  // Message types
  MESSAGE_TYPES: {
    // Connection
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    RECONNECT: "reconnect",

    // Messaging
    MESSAGE: "message",
    NEW_MESSAGE: "new_message",
    MESSAGE_SENT: "message_sent",
    MESSAGE_DELIVERED: "message_delivered",
    MESSAGE_READ: "message_read",

    // Typing
    TYPING_START: "typing_start",
    TYPING_STOP: "typing_stop",

    // Media
    MEDIA_UPLOAD_START: "media_upload_start",
    MEDIA_UPLOAD_PROGRESS: "media_upload_progress",
    MEDIA_UPLOAD_COMPLETE: "media_upload_complete",
    MEDIA_UPLOAD_ERROR: "media_upload_error",

    // System
    ERROR: "error",
    PING: "ping",
    PONG: "pong",
  },

  // Error codes
  ERROR_CODES: {
    CONNECTION_FAILED: 4001,
    AUTH_FAILED: 4002,
    MESSAGE_FAILED: 4003,
    INVALID_MESSAGE: 4004,
    RATE_LIMITED: 4005,
    SERVER_ERROR: 4009,
  },
} as const;

export type WebSocketMessageType =
  (typeof WEBSOCKET_CONFIG.MESSAGE_TYPES)[keyof typeof WEBSOCKET_CONFIG.MESSAGE_TYPES];
