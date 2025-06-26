import crypto from 'crypto';

/**
 * Generates a secure conversation ID using cryptographic hashing
 * This prevents conversation ID prediction and enumeration attacks
 */
export function generateSecureConversationId(userId1: string, userId2: string): string {
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required');
  }

  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with the same user');
  }

  // Sort user IDs to ensure consistency
  const sortedIds = [userId1, userId2].sort();
  
  // Add a secret salt from environment
  const salt = process.env.CONVERSATION_ID_SALT || 'default-salt-change-in-production';
  
  // Create deterministic but unpredictable conversation ID
  const input = `${sortedIds[0]}_${sortedIds[1]}_${salt}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Use first 16 characters for readability while maintaining security
  const conversationId = `conv_${hash.substring(0, 16)}`;
  
  return conversationId;
}

/**
 * Validates that a conversation ID was generated correctly for given users
 */
export function validateConversationIdForUsers(
  conversationId: string,
  userId1: string,
  userId2: string
): boolean {
  try {
    const expectedId = generateSecureConversationId(userId1, userId2);
    return conversationId === expectedId;
  } catch (error) {
    console.error('Error validating conversation ID:', error);
    return false;
  }
}

/**
 * Legacy function for backward compatibility
 * This maintains the old format but adds validation
 */
export function getConversationId(userId1: string, userId2: string): string {
  // For now, use the legacy format but with validation
  // In production, gradually migrate to secure format
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required');
  }

  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with the same user');
  }

  // Return sorted IDs for consistency
  return [userId1, userId2].sort().join('_');
}

/**
 * Enhanced conversation ID generation with additional security
 */
export function generateConversationIdV2(
  userId1: string,
  userId2: string,
  options: {
    useSecureFormat?: boolean;
    includeTimestamp?: boolean;
  } = {}
): string {
  const { useSecureFormat = false, includeTimestamp = false } = options;

  if (useSecureFormat) {
    let baseId = generateSecureConversationId(userId1, userId2);
    
    if (includeTimestamp) {
      // Add timestamp hash for additional uniqueness if needed
      const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Daily rotation
      const timestampHash = crypto.createHash('md5').update(timestamp.toString()).digest('hex').substring(0, 4);
      baseId += `_${timestampHash}`;
    }
    
    return baseId;
  }

  // Fallback to legacy format
  return getConversationId(userId1, userId2);
}

/**
 * Extracts user IDs from a conversation ID (works with both formats)
 */
export function extractUserIdsFromConversationId(conversationId: string): {
  userId1: string;
  userId2: string;
} | null {
  try {
    // Handle secure format (conv_xxxxx)
    if (conversationId.startsWith('conv_')) {
      // For secure format, we'd need to maintain a mapping table
      // This is a limitation of the secure approach
      throw new Error('Secure conversation ID format requires database lookup');
    }

    // Handle legacy format (userId1_userId2)
    const parts = conversationId.split('_');
    if (parts.length === 2) {
      return {
        userId1: parts[0],
        userId2: parts[1],
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting user IDs from conversation ID:', error);
    return null;
  }
}

/**
 * Validates conversation ID format and structure
 */
export function isValidConversationIdFormat(conversationId: string): boolean {
  if (!conversationId || typeof conversationId !== 'string') {
    return false;
  }

  // Check secure format
  if (conversationId.startsWith('conv_')) {
    // Should be conv_ followed by 16 hex characters
    const pattern = /^conv_[a-f0-9]{16}(_[a-f0-9]{4})?$/;
    return pattern.test(conversationId);
  }

  // Check legacy format
  const parts = conversationId.split('_');
  if (parts.length === 2) {
    // Both parts should be valid user ID format
    const userIdPattern = /^[a-zA-Z0-9_-]+$/;
    return (
      parts[0].length >= 3 &&
      parts[0].length <= 50 &&
      parts[1].length >= 3 &&
      parts[1].length <= 50 &&
      userIdPattern.test(parts[0]) &&
      userIdPattern.test(parts[1]) &&
      parts[0] !== parts[1] &&
      parts[0] <= parts[1] // Ensure sorted order
    );
  }

  return false;
}

/**
 * Migration utility to convert legacy conversation IDs to secure format
 */
export function migrateConversationIdToSecure(legacyConversationId: string): string {
  const userIds = extractUserIdsFromConversationId(legacyConversationId);
  
  if (!userIds) {
    throw new Error('Invalid legacy conversation ID format');
  }

  return generateSecureConversationId(userIds.userId1, userIds.userId2);
}

/**
 * Sanitizes and validates conversation ID input
 */
export function sanitizeConversationId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim and validate
  const trimmed = input.trim();
  
  if (!isValidConversationIdFormat(trimmed)) {
    return null;
  }

  return trimmed;
}