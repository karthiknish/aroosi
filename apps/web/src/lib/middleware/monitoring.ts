import { NextRequest } from "next/server";

interface MonitoringEvent {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  error?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

class MonitoringService {
  private events: MonitoringEvent[] = [];
  private alerts: string[] = [];

  logEvent(event: Omit<MonitoringEvent, "timestamp">) {
    const fullEvent: MonitoringEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Alert on critical errors
    if (event.statusCode >= 500) {
      this.addAlert(
        `Critical error: ${event.endpoint} returned ${event.statusCode}`
      );
    }

    // Alert on high error rate
    const recentEvents = this.events.filter(
      (e) => e.timestamp > Date.now() - 60000 // Last minute
    );
    const errorRate =
      recentEvents.filter((e) => e.statusCode >= 400).length /
      recentEvents.length;

    if (errorRate > 0.1) {
      // 10% error rate
      this.addAlert(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }
  }

  private addAlert(message: string) {
    const alert = `[${new Date().toISOString()}] ${message}`;
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log to console in production
    console.error(alert);
  }

  getMetrics() {
    const now = Date.now();
    const lastHour = this.events.filter((e) => e.timestamp > now - 3600000);

    return {
      totalRequests: lastHour.length,
      errorRate:
        lastHour.filter((e) => e.statusCode >= 400).length / lastHour.length,
      avgResponseTime:
        lastHour.reduce((sum, e) => sum + e.duration, 0) / lastHour.length,
      alerts: this.alerts.slice(-10),
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();

    if (metrics.errorRate > 0.05) return "unhealthy";
    if (metrics.errorRate > 0.02) return "degraded";
    return "healthy";
  }
}

export const monitoringService = new MonitoringService();

export function createMonitoringMiddleware(endpoint: string) {
  return async function monitoringMiddleware(
    request: NextRequest,
    handler: () => Promise<Response>
  ): Promise<Response> {
    const startTime = Date.now();
    const userId =
      request.headers.get("authorization")?.split(".")[1] || "anonymous";
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
      const response = await handler();
      const duration = Date.now() - startTime;

      monitoringService.logEvent({
        endpoint,
        method: request.method,
        statusCode: response.status,
        duration,
        userId,
        ip,
        userAgent,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      monitoringService.logEvent({
        endpoint,
        method: request.method,
        statusCode: 500,
        duration,
        error: error instanceof Error ? error.message : String(error),
        userId,
        ip,
        userAgent,
      });

      throw error;
    }
  };
}
