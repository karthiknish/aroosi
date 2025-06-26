/**
 * Biometric Authentication Utilities
 * Helper functions for validating biometric authentication in API routes
 */

import { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export interface BiometricValidationResult {
  required: boolean;
  valid: boolean;
  timestamp?: number;
  deviceId?: string;
  error?: string;
}

/**
 * Check if biometric authentication is required for a specific action
 */
export async function checkBiometricRequired(
  action: string,
  token: string
): Promise<boolean> {
  try {
    // TODO: Implement biometric auth when biometric API is available
    // const required = await fetchQuery(
    //   api.biometric.requiresBiometricAuth,
    //   { action },
    //   { token }
    // );
    // return required;
    return false;
  } catch (error) {
    console.error("Error checking biometric requirement:", error);
    return false;
  }
}

/**
 * Validate biometric authentication headers
 */
export function validateBiometricAuthHeaders(
  request: NextRequest
): BiometricValidationResult {
  const biometricAuth = request.headers.get("x-biometric-auth");
  const biometricTimestamp = request.headers.get("x-biometric-timestamp");
  const biometricDeviceId = request.headers.get("x-biometric-device-id");

  // If no biometric headers present
  if (!biometricAuth || !biometricTimestamp || !biometricDeviceId) {
    return {
      required: true,
      valid: false,
      error: "Biometric authentication headers missing"
    };
  }

  // Validate timestamp (should be recent - within 5 minutes)
  const timestamp = parseInt(biometricTimestamp);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (isNaN(timestamp) || (now - timestamp) > fiveMinutes) {
    return {
      required: true,
      valid: false,
      error: "Biometric authentication timestamp expired"
    };
  }

  // Basic validation of auth token format
  if (biometricAuth !== "verified" && !biometricAuth.startsWith("biometric_")) {
    return {
      required: true,
      valid: false,
      error: "Invalid biometric authentication token"
    };
  }

  return {
    required: true,
    valid: true,
    timestamp,
    deviceId: biometricDeviceId
  };
}

/**
 * Comprehensive biometric validation for API endpoints
 */
export async function validateBiometricAuth(
  request: NextRequest,
  action: string,
  token: string
): Promise<BiometricValidationResult> {
  try {
    // First check if biometric is required for this action
    const required = await checkBiometricRequired(action, token);

    if (!required) {
      return {
        required: false,
        valid: true
      };
    }

    // If required, validate the biometric auth headers
    const validation = validateBiometricAuthHeaders(request);
    return validation;

  } catch (error) {
    console.error("Error validating biometric auth:", error);
    return {
      required: true,
      valid: false,
      error: "Biometric validation failed"
    };
  }
}

/**
 * Middleware function to check biometric authentication
 */
export async function requireBiometricAuth(
  request: NextRequest,
  action: string,
  token: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  const validation = await validateBiometricAuth(request, action, token);

  if (!validation.required) {
    return { success: true };
  }

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Biometric authentication required",
      status: 403
    };
  }

  return { success: true };
}

/**
 * Helper to extract biometric metadata from request
 */
export function extractBiometricMetadata(request: NextRequest) {
  return {
    deviceId: request.headers.get("x-biometric-device-id"),
    biometricType: request.headers.get("x-biometric-type"), // 'fingerprint', 'face', etc.
    platform: request.headers.get("x-biometric-platform"), // 'ios', 'android'
    timestamp: request.headers.get("x-biometric-timestamp"),
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

/**
 * Actions that typically require biometric authentication
 */
export const BIOMETRIC_PROTECTED_ACTIONS = {
  // Payment related
  SUBSCRIPTION_PURCHASE: "subscription_purchase",
  PAYMENT_METHOD_UPDATE: "payment_method_update",
  BILLING_INFO_UPDATE: "billing_info_update",

  // Profile related
  PROFILE_DELETE: "profile_delete",
  PROFILE_UPDATE_SENSITIVE: "profile_update_sensitive",
  CONTACT_INFO_UPDATE: "contact_info_update",

  // Settings related
  SECURITY_SETTINGS_UPDATE: "security_settings_update",
  BIOMETRIC_SETTINGS_UPDATE: "biometric_settings_update",
  ACCOUNT_DELETION: "account_deletion",

  // Data access
  EXPORT_USER_DATA: "export_user_data",
  AUDIT_LOG_ACCESS: "audit_log_access",
  SENSITIVE_DATA_ACCESS: "sensitive_data_access",
} as const;

/**
 * Determine if a profile update involves sensitive fields
 */
export function isProfileUpdateSensitive(updateData: Record<string, unknown>): boolean {
  const sensitiveFields = [
    'email',
    'phoneNumber',
    'fullName',
    'dateOfBirth',
    'country',
    'annualIncome',
    'maritalStatus'
  ];

  return sensitiveFields.some(field => field in updateData);
}