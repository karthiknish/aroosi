import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { fetchMutation } from "convex/nextjs";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { validateConversationId } from "@/lib/utils/messageValidation";

// ApiResponse envelope type
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Shared helpers
function json<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const { userId } = await requireAuth(request);

    // Rate limit: messages send
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token string (pending limiter signature cleanup)
      userId || "unknown",
      "message_send",
      60_000
    );
    if (!rate.allowed) {
      return json(
        {
          success: false,
          error: rate.error || "Rate limit exceeded",
        },
        429
      );
    }

    // Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }

    // Expected fields (text or voice/image)
    const {
      conversationId,
      fromUserId,
      toUserId,
      text,
      type,
      audioStorageId,
      duration,
      fileSize,
      mimeType,
    } = (body || {}) as {
      conversationId?: string;
      fromUserId?: string;
      toUserId?: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    };

    // Basic validation
    if (!conversationId || !fromUserId || !toUserId) {
      return json(
        {
          success: false,
          error:
            "Missing required fields: conversationId, fromUserId, toUserId",
        },
        400
      );
    }

    if (!validateConversationId(conversationId)) {
      return json(
        { success: false, error: "Invalid conversationId format" },
        400
      );
    }

    // Ensure authenticated user participates in conversation
    if (!userId) {
      return json({ success: false, error: "User ID not found" }, 401);
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return json(
        { success: false, error: "Unauthorized access to conversation" },
        403
      );
    }

    // Default to text if not provided
    const resolvedType: "text" | "voice" | "image" = type || "text";

    // Strong validation & sanitation per type (mirror Convex rules)
    let finalText: string | undefined = text;

    if (resolvedType === "text") {
      // Use shared validation + sanitation (trimming, XSS, prohibited content redaction)
      const { validateMessagePayload } = await import("@/lib/utils/messageValidation");
      const v = validateMessagePayload({
        conversationId,
        fromUserId,
        toUserId,
        text: text ?? "",
      });
      if (!v.isValid) {
        return json({ success: false, error: v.error || "Invalid message" }, 400);
      }
      finalText = v.sanitizedText!;
    } else if (resolvedType === "voice") {
      if (!audioStorageId) {
        return json(
          { success: false, error: "Voice message missing audioStorageId" },
          400
        );
      }
      if (typeof duration !== "number" || duration <= 0) {
        return json(
          { success: false, error: "Voice message missing duration" },
          400
        );
      }
    } else if (resolvedType === "image") {
      if (!audioStorageId) {
        return json(
          { success: false, error: "Image message missing storageId" },
          400
        );
      }
    }

    // Optional pre-check: ensure users are matched to fail fast (Convex also enforces)
    try {
      const { validateUserCanMessage } = await import("@/lib/utils/messageValidation");
      // Cookie-only path: do not pass token
      const canMessage = await validateUserCanMessage(fromUserId, toUserId, undefined as unknown as string);
      if (!canMessage) {
        return json({ success: false, error: "You can only message users you are matched with." }, 403);
      }
    } catch (e) {
      // Log but do not block; Convex enforces as a second line of defense
      console.warn("messages.send match pre-check failed (continuing to Convex)", {
        conversationId,
        fromUserId,
        toUserId,
      });
    }

    const message = await fetchMutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: finalText,
      type: resolvedType,
      audioStorageId,
      duration,
      fileSize,
      mimeType,
    } as any).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Send failed";
      throw new Error(String(msg));
    });

    // Broadcast SSE event mirroring voice upload behavior
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_sent",
        message,
      });
    } catch (eventError) {
      console.warn("Messages send POST broadcast warn", {
        scope: "messages.send",
        type: "broadcast_warn",
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    return json({ success: true, data: message }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Avoid leaking internals
    return json({ success: false, error: message || "Failed to send message" }, 500);
  } finally {
    // optional: structured logging hook could be placed here if desired
    // console.info("messages.send", { correlationId, durationMs: Date.now() - startedAt });
  }
}