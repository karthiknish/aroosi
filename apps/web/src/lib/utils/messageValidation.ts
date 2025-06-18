import { Id } from "@convex/_generated/dataModel";

export interface MessageValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedText?: string;
}

export interface MessageLimits {
  maxLength: number;
  minLength: number;
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
}

// Default message limits
export const MESSAGE_LIMITS: MessageLimits = {
  maxLength: 2000,
  minLength: 1,
  maxMessagesPerMinute: 10,
  maxMessagesPerHour: 100,
};

// Prohibited patterns (basic content filtering)
const PROHIBITED_PATTERNS = [
  // Personal information patterns
  /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?\b/g, // URLs
  
  // Spam patterns
  /\b(?:click here|free money|urgent|limited time|act now)\b/gi,
  
  // Basic profanity filter (extend as needed)
  /\b(?:spam|scam|fake|bot)\b/gi,
];

// XSS and injection patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<\s*\/?\s*(?:script|iframe|object|embed|form|input|meta|link)\b[^>]*>/gi,
];

/**
 * Validates and sanitizes message content
 */
export function validateMessage(text: string): MessageValidationResult {
  // Basic validation
  if (typeof text !== 'string') {
    return { isValid: false, error: 'Message must be a string' };
  }

  const trimmedText = text.trim();

  // Length validation
  if (trimmedText.length < MESSAGE_LIMITS.minLength) {
    return { isValid: false, error: 'Message is too short' };
  }

  if (trimmedText.length > MESSAGE_LIMITS.maxLength) {
    return { isValid: false, error: `Message is too long (max ${MESSAGE_LIMITS.maxLength} characters)` };
  }

  // XSS validation
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(trimmedText)) {
      return { isValid: false, error: 'Message contains prohibited content' };
    }
  }

  // Content filtering
  let sanitizedText = trimmedText;
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(sanitizedText)) {
      // Replace with redacted message or reject
      sanitizedText = sanitizedText.replace(pattern, '[REDACTED]');
    }
  }

  // Additional validation for empty content after sanitization
  if (sanitizedText.trim().length === 0) {
    return { isValid: false, error: 'Message content is not allowed' };
  }

  return {
    isValid: true,
    sanitizedText: sanitizedText.trim(),
  };
}

/**
 * Validates user IDs format
 */
export function validateUserId(userId: string): boolean {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return false;
  }
  
  // Basic format validation - should be alphanumeric with possible underscores/hyphens
  const userIdPattern = /^[a-zA-Z0-9_-]+$/;
  return userIdPattern.test(userId) && userId.length >= 3 && userId.length <= 50;
}

/**
 * Validates conversation ID format
 */
export function validateConversationId(conversationId: string): boolean {
  if (typeof conversationId !== 'string' || conversationId.trim().length === 0) {
    return false;
  }
  
  // Should be in format "userId1_userId2" where userIds are sorted
  const parts = conversationId.split('_');
  if (parts.length !== 2) {
    return false;
  }
  
  const [userId1, userId2] = parts;
  
  // Validate both user IDs
  if (!validateUserId(userId1) || !validateUserId(userId2)) {
    return false;
  }
  
  // Ensure they are different users
  if (userId1 === userId2) {
    return false;
  }
  
  // Ensure they are sorted (security measure)
  if (userId1 > userId2) {
    return false;
  }
  
  return true;
}

/**
 * Validates complete message payload
 */
export function validateMessagePayload(payload: {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
}): MessageValidationResult {
  const { conversationId, fromUserId, toUserId, text } = payload;

  // Validate conversation ID
  if (!validateConversationId(conversationId)) {
    return { isValid: false, error: 'Invalid conversation ID format' };
  }

  // Validate user IDs
  if (!validateUserId(fromUserId)) {
    return { isValid: false, error: 'Invalid sender user ID' };
  }

  if (!validateUserId(toUserId)) {
    return { isValid: false, error: 'Invalid recipient user ID' };
  }

  // Ensure users are different
  if (fromUserId === toUserId) {
    return { isValid: false, error: 'Cannot send message to yourself' };
  }

  // Validate that the conversation ID matches the user IDs
  const expectedConversationId = [fromUserId, toUserId].sort().join('_');
  if (conversationId !== expectedConversationId) {
    return { isValid: false, error: 'Conversation ID does not match user IDs' };
  }

  // Validate message content
  const messageValidation = validateMessage(text);
  if (!messageValidation.isValid) {
    return messageValidation;
  }

  return {
    isValid: true,
    sanitizedText: messageValidation.sanitizedText,
  };
}

/**
 * Rate limiting storage (in production, use Redis or database)
 */
const messageRates = new Map<string, { timestamps: number[]; lastCleanup: number }>();

/**
 * Checks rate limiting for a user
 */
export function checkRateLimit(userId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const userKey = `msg_rate_${userId}`;
  
  // Clean up old entries every 5 minutes
  if (!messageRates.has(userKey)) {
    messageRates.set(userKey, { timestamps: [], lastCleanup: now });
  }
  
  const userRate = messageRates.get(userKey)!;
  
  // Clean up old timestamps
  if (now - userRate.lastCleanup > 5 * 60 * 1000) {
    const oneHourAgo = now - 60 * 60 * 1000;
    userRate.timestamps = userRate.timestamps.filter(ts => ts > oneHourAgo);
    userRate.lastCleanup = now;
  }
  
  // Check per-minute limit
  const oneMinuteAgo = now - 60 * 1000;
  const messagesLastMinute = userRate.timestamps.filter(ts => ts > oneMinuteAgo).length;
  
  if (messagesLastMinute >= MESSAGE_LIMITS.maxMessagesPerMinute) {
    return { allowed: false, error: 'Rate limit exceeded: too many messages per minute' };
  }
  
  // Check per-hour limit
  const oneHourAgo = now - 60 * 60 * 1000;
  const messagesLastHour = userRate.timestamps.filter(ts => ts > oneHourAgo).length;
  
  if (messagesLastHour >= MESSAGE_LIMITS.maxMessagesPerHour) {
    return { allowed: false, error: 'Rate limit exceeded: too many messages per hour' };
  }
  
  // Record this message
  userRate.timestamps.push(now);
  
  return { allowed: true };
}

/**
 * Validates that two users are allowed to message each other
 * This checks if they are matched in your system
 */
export async function validateUserCanMessage(
  fromUserId: string, 
  toUserId: string,
  token?: string
): Promise<boolean> {
  // Import the match validation function to avoid circular dependencies
  const { validateUsersAreMatched } = await import('./matchValidation');
  
  if (!token) {
    console.error('Token required for match validation');
    return false;
  }
  
  try {
    return await validateUsersAreMatched(fromUserId, toUserId, token);
  } catch (error) {
    console.error('Error validating user messaging permissions:', error);
    return false;
  }
}