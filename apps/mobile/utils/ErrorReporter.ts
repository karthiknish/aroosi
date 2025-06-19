import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AppError, ErrorReport } from './errorHandling';

export interface ErrorReportData {
  errorId: string;
  message: string;
  stack?: string;
  type: string;
  context: Record<string, any>;
  timestamp: number;
  appVersion: string;
  platform: string;
  platformVersion: string;
  deviceInfo: {
    brand?: string;
    model?: string;
    osVersion?: string;
  };
  userAgent?: string;
  userId?: string;
  sessionId: string;
}

export interface ReportingConfig {
  enabled: boolean;
  endpoint?: string;
  maxReportsInStorage: number;
  reportingInterval: number; // in milliseconds
  includeStackTrace: boolean;
  includeBreadcrumbs: boolean;
}

const DEFAULT_CONFIG: ReportingConfig = {
  enabled: !__DEV__, // Only report in production
  maxReportsInStorage: 100,
  reportingInterval: 30000, // 30 seconds
  includeStackTrace: true,
  includeBreadcrumbs: true,
};

class ErrorReporter {
  private config: ReportingConfig;
  private sessionId: string;
  private breadcrumbs: Array<{ timestamp: number; message: string; category: string }> = [];
  private pendingReports: ErrorReportData[] = [];
  private reportingTimer: NodeJS.Timeout | null = null;
  private isReporting = false;

  constructor(config: Partial<ReportingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    if (this.config.enabled) {
      this.initializeReporting();
    }
  }

  /**
   * Initialize error reporting
   */
  private async initializeReporting() {
    await this.loadPendingReports();
    this.startReportingTimer();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Report an error
   */
  async reportError(error: AppError | Error, context: Record<string, any> = {}): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const errorReport = await this.createErrorReport(error, context);
      await this.storeReport(errorReport);
      
      // Try to send immediately if we're online
      this.scheduleReporting();
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Create a structured error report
   */
  private async createErrorReport(
    error: AppError | Error, 
    context: Record<string, any>
  ): Promise<ErrorReportData> {
    const errorId = this.generateErrorId();
    
    const report: ErrorReportData = {
      errorId,
      message: error.message,
      stack: this.config.includeStackTrace ? error.stack : undefined,
      type: error instanceof AppError ? error.type : 'unknown',
      context: {
        ...context,
        ...(error instanceof AppError ? error.context : {}),
      },
      timestamp: Date.now(),
      appVersion: Constants.expoConfig?.version || 'unknown',
      platform: Platform.OS,
      platformVersion: Platform.Version.toString(),
      deviceInfo: await this.getDeviceInfo(),
      userId: context.userId,
      sessionId: this.sessionId,
    };

    if (this.config.includeBreadcrumbs) {
      report.context.breadcrumbs = this.breadcrumbs.slice(-10); // Last 10 breadcrumbs
    }

    return report;
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo() {
    return {
      brand: Constants.deviceName || 'unknown',
      model: Constants.platform?.ios?.model || Constants.platform?.android?.arch || 'unknown',
      osVersion: Platform.Version.toString(),
    };
  }

  /**
   * Store error report locally
   */
  private async storeReport(report: ErrorReportData): Promise<void> {
    try {
      this.pendingReports.push(report);
      
      // Limit the number of stored reports
      if (this.pendingReports.length > this.config.maxReportsInStorage) {
        this.pendingReports = this.pendingReports.slice(-this.config.maxReportsInStorage);
      }

      await AsyncStorage.setItem('errorReports', JSON.stringify(this.pendingReports));
    } catch (error) {
      console.error('Failed to store error report:', error);
    }
  }

  /**
   * Load pending reports from storage
   */
  private async loadPendingReports(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('errorReports');
      if (stored) {
        this.pendingReports = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending reports:', error);
      this.pendingReports = [];
    }
  }

  /**
   * Start the reporting timer
   */
  private startReportingTimer(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }

    this.reportingTimer = setInterval(() => {
      this.sendPendingReports();
    }, this.config.reportingInterval);
  }

  /**
   * Schedule immediate reporting
   */
  private scheduleReporting(): void {
    if (!this.isReporting) {
      // Use a small delay to batch multiple errors
      setTimeout(() => {
        this.sendPendingReports();
      }, 1000);
    }
  }

  /**
   * Send pending reports to the server
   */
  private async sendPendingReports(): Promise<void> {
    if (this.isReporting || this.pendingReports.length === 0 || !this.config.endpoint) {
      return;
    }

    this.isReporting = true;
    
    try {
      const reportsToSend = [...this.pendingReports];
      
      for (const report of reportsToSend) {
        const success = await this.sendReport(report);
        
        if (success) {
          // Remove sent report from pending
          this.pendingReports = this.pendingReports.filter(r => r.errorId !== report.errorId);
        }
      }

      // Save updated pending reports
      await AsyncStorage.setItem('errorReports', JSON.stringify(this.pendingReports));
      
    } catch (error) {
      console.error('Failed to send error reports:', error);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Send a single report to the server
   */
  private async sendReport(report: ErrorReportData): Promise<boolean> {
    if (!this.config.endpoint) {
      return false;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send error report:', error);
      return false;
    }
  }

  /**
   * Add a breadcrumb for context
   */
  addBreadcrumb(message: string, category = 'general'): void {
    if (!this.config.includeBreadcrumbs) {
      return;
    }

    this.breadcrumbs.push({
      timestamp: Date.now(),
      message,
      category,
    });

    // Keep only the last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  /**
   * Configure the error reporter
   */
  configure(config: Partial<ReportingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled && !this.reportingTimer) {
      this.initializeReporting();
    } else if (!this.config.enabled && this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }

  /**
   * Get reporting statistics
   */
  getStats() {
    return {
      pendingReports: this.pendingReports.length,
      sessionId: this.sessionId,
      breadcrumbs: this.breadcrumbs.length,
      isReporting: this.isReporting,
      enabled: this.config.enabled,
    };
  }

  /**
   * Clear all pending reports
   */
  async clearReports(): Promise<void> {
    this.pendingReports = [];
    this.breadcrumbs = [];
    await AsyncStorage.removeItem('errorReports');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }
}

// Export singleton instance
export const errorReporter = new ErrorReporter();