import type { MessageType } from "@aroosi/shared/types";

export interface RealtimeMessage {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: MessageType;
  audioStorageId?: string;
  imageStorageId?: string;
  duration?: number;
  createdAt: number;
  readAt?: number;
  isDelivered?: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor(
    private url: string,
    private onMessage: (data: any) => void,
    private onConnectionChange: (status: ConnectionStatus) => void
  ) {}

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.onConnectionChange({
      isConnected: false,
      isConnecting: true,
      error: null,
    });

    try {
      // Switch to cookie-authenticated WebSocket; token no longer appended.
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange({
          isConnected: true,
          isConnecting: false,
          error: null,
        });

        // Send queued messages
        this.messageQueue.forEach((message) => this.send(message));
        this.messageQueue = [];
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch {}
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.onConnectionChange({
          isConnected: false,
          isConnecting: false,
          error: event.reason || "Connection closed",
        });

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.onConnectionChange({
          isConnected: false,
          isConnecting: false,
          error: "Connection error",
        });
      };
    } catch {
      this.onConnectionChange({
        isConnected: false,
        isConnecting: false,
        error: "Failed to create connection",
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      this.messageQueue.push(data);
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
