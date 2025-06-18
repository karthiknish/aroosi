import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { 
  validateMessagePayload, 
  validateConversationId, 
  checkRateLimit,
  validateUserCanMessage 
} from "@/lib/utils/messageValidation";
// import { Notifications } from "@/lib/notify"; // future use

// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const limitParam = searchParams.get("limit");
  const beforeParam = searchParams.get("before");
  
  // Validate conversation ID format
  if (!conversationId || !validateConversationId(conversationId)) {
    return errorResponse("Invalid or missing conversationId parameter", 400);
  }
  
  // Validate and sanitize limit parameter
  let limit: number | undefined;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return errorResponse("Invalid limit parameter (must be 1-100)", 400);
    }
    limit = parsedLimit;
  }
  
  // Validate before parameter
  let before: number | undefined;
  if (beforeParam) {
    const parsedBefore = parseInt(beforeParam, 10);
    if (isNaN(parsedBefore) || parsedBefore < 0) {
      return errorResponse("Invalid before parameter", 400);
    }
    before = parsedBefore;
  }
  
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;
  
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
  }
  
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  
  try {
    // TODO: Add authorization check - verify user is part of this conversation
    // This should be implemented by checking if the current user ID (from token)
    // matches one of the user IDs in the conversation ID
    // const userIds = conversationId.split('_');
    // const currentUserId = getCurrentUserIdFromToken(token);
    // if (!userIds.includes(currentUserId)) {
    //   return errorResponse("Unauthorized access to conversation", 403);
    // }
    
    const result = await convex.query(api.messages.getMessages, {
      conversationId,
      limit,
      before,
    });
    return successResponse(result);
  } catch (error) {
    // Check for auth-specific errors
    const isAuthError = error instanceof Error && 
      (error.message.includes("Unauthenticated") || 
       error.message.includes("Unauthorized") ||
       error.message.includes("token"));
       
    const details =
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined;
        
    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to fetch messages", 
      isAuthError ? 401 : 500, 
      details
    );
  }
}

// POST: Send a message
export async function POST(req: NextRequest) {
  const authCheckPost = requireUserToken(req);
  if ("errorResponse" in authCheckPost) return authCheckPost.errorResponse;
  const { token } = authCheckPost;
  
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return errorResponse("Invalid request body", 400, {
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
  
  const { conversationId, fromUserId, toUserId, text } = body || {};
  
  // Basic required field validation
  if (!conversationId || !fromUserId || !toUserId || !text) {
    return errorResponse("Missing required fields", 400);
  }
  
  // Comprehensive payload validation
  const validation = validateMessagePayload({ conversationId, fromUserId, toUserId, text });
  if (!validation.isValid) {
    return errorResponse(validation.error || "Invalid message payload", 400);
  }
  
  // Rate limiting check
  const rateLimitCheck = checkRateLimit(fromUserId);
  if (!rateLimitCheck.allowed) {
    return errorResponse(rateLimitCheck.error || "Rate limit exceeded", 429);
  }
  
  // TODO: Verify user authorization (fromUserId matches authenticated user)
  // TODO: Verify users are matched and can message each other
  const canMessage = await validateUserCanMessage(fromUserId, toUserId);
  if (!canMessage) {
    return errorResponse("Users are not authorized to message each other", 403);
  }
  
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
  }
  
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  
  try {
    // Use sanitized text from validation
    const sanitizedText = validation.sanitizedText || text;
    
    const result = await convex.mutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: sanitizedText,
    });
    
    // Broadcast to SSE subscribers
    const { eventBus } = await import("@/lib/eventBus");
    eventBus.emit(conversationId, result);

    // TODO: trigger email notification to receiver if offline (requires user lookup function)
    // TODO: Log message for moderation/audit purposes

    return successResponse(result);
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication") ||
        error.message.includes("Unauthorized"));
        
    const details =
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined;
        
    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to send message",
      isAuthError ? 401 : 500,
      details
    );
  }
}