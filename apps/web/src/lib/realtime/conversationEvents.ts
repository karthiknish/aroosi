import { db } from "@/lib/firebaseAdmin";
import { generateCorrelationId } from "@/lib/api/handler";

export type ConversationEventType =
  | "sse_open"
  | "message_sent"
  | "message_read"
  | "typing_start"
  | "typing_stop";

export type ConversationEvent = {
  // Canonical event envelope version.
  // Keep this additive so older clients parsing {type,message,...} still work.
  v: 1;
  id: string;
  type: ConversationEventType;
  conversationId: string;
  createdAt: number;
  // Optional actor info for clients
  userId?: string;

  // Canonical payload container (preferred by new clients).
  payload?: Record<string, unknown>;

  // Event-specific payload
  message?: unknown;
  readAt?: number;
  at?: number;
};

export type ConversationEventInput = Omit<
  ConversationEvent,
  "id" | "conversationId" | "createdAt" | "v"
> & {
  type: ConversationEventType;
};

function eventsCollection(conversationId: string) {
  return db.collection("conversations").doc(conversationId).collection("events");
}

export async function emitConversationEvent(
  conversationId: string,
  event: ConversationEventInput
): Promise<ConversationEvent> {
  const id = `${Date.now().toString(36)}_${generateCorrelationId()}`;
  const createdAt = Date.now();

  const derivedPayload: Record<string, unknown> | undefined =
    event.payload ??
    (event.type === "message_sent" && event.message != null
      ? { message: event.message }
      : event.type === "message_read" && event.readAt != null
        ? { readAt: event.readAt }
        : (event.type === "typing_start" || event.type === "typing_stop") && event.at != null
          ? { at: event.at }
          : undefined);

  const full: ConversationEvent = {
    id,
    conversationId,
    createdAt,
    ...event,
    payload: derivedPayload,
    v: 1,
  };

  await eventsCollection(conversationId).doc(id).set(full, { merge: false });
  return full;
}

export async function fetchConversationEvents(params: {
  conversationId: string;
  since?: number;
  sinceInclusive?: boolean;
  limit?: number;
}): Promise<ConversationEvent[]> {
  const {
    conversationId,
    since = 0,
    sinceInclusive = false,
    limit = 50,
  } = params;

  let q = eventsCollection(conversationId)
    .orderBy("createdAt", "asc")
    .limit(Math.max(1, Math.min(200, limit)));

  if (since > 0) {
    q = q.where("createdAt", sinceInclusive ? ">=" : ">", since);
  }

  const snap = await q.get();
  return snap.docs.map(
    (d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) =>
      d.data() as ConversationEvent
  );
}
