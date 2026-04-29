import { getJson, postJson } from "@/lib/http/client";

type Envelope<T> = { success?: boolean; data?: T };

type EnrichedProfile = {
  userId?: string;
  _id?: string;
  id?: string;
  fullName?: string | null;
  city?: string | null;
  profileImageUrls?: string[] | null;
  imageUrl?: string | null;
};

export type ShortlistEntry = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  createdAt: number;
};

type NoteResponse = { note?: string; updatedAt?: number };
type QuickPicksResponse = { userIds?: string[]; profiles?: EnrichedProfile[] };
type IcebreakersResponse = { success?: boolean; data?: Icebreaker[] };

export async function fetchShortlists(): Promise<ShortlistEntry[]> {
  const res = await getJson<{ success?: boolean; data?: ShortlistEntry[] }>(
    "/api/engagement/shortlist"
  );
  if (res && typeof res === "object" && Array.isArray((res as Envelope<ShortlistEntry[]>).data)) {
    return (res as Envelope<ShortlistEntry[]>).data as ShortlistEntry[];
  }
  if (Array.isArray(res)) return res as unknown as ShortlistEntry[];
  return [];
}

export async function toggleShortlist(
  toUserId: string
): Promise<{ success: boolean; added?: boolean; removed?: boolean }> {
  try {
    return await postJson("/api/engagement/shortlist", { toUserId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update shortlist";
    throw new Error(msg);
  }
}

export async function enrichProfiles(
  userIds: string[]
): Promise<
  Array<{
    userId: string;
    fullName?: string | null;
    city?: string | null;
    imageUrl?: string | null;
  }>
> {
  if (userIds.length === 0) return [];
  try {
    const res = await postJson("/api/engagement/profiles", { userIds });
    const list = (res && typeof res === "object" ? (res as Envelope<EnrichedProfile[]>).data : undefined) || res;
    if (!Array.isArray(list)) return [];
    return (list as EnrichedProfile[])
      .map((p) => ({
        userId: p.userId || p._id || p.id || "",
        fullName: p.fullName || null,
        city: p.city || null,
        imageUrl: Array.isArray(p.profileImageUrls)
          ? p.profileImageUrls[0] || null
          : null,
      }))
      .filter((profile) => profile.userId.length > 0);
  } catch {
    return [];
  }
}

export async function fetchNote(
  toUserId: string
): Promise<{ note?: string; updatedAt?: number } | null> {
  const res = await getJson<Envelope<NoteResponse> | NoteResponse>(
    `/api/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`
  );
  if (res && typeof res === "object" && "data" in res) {
    return res.data || null;
  }
  return (res as NoteResponse) || null;
}

export async function setNote(
  toUserId: string,
  note: string
): Promise<boolean> {
  try {
    const res = await postJson<Envelope<unknown>>("/api/engagement/notes", { toUserId, note });
    return !!res?.success;
  } catch {
    return false;
  }
}

export type QuickPickProfile = {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  imageUrl?: string | null;
};

/**
 * Get current day key for quick picks (standardized to YYYY-MM-DD)
 */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getQuickPicks(
  dayKey?: string
): Promise<{ userIds: string[]; profiles: QuickPickProfile[] }> {
  const url = dayKey
    ? `/api/engagement/quick-picks?day=${encodeURIComponent(dayKey)}`
    : "/api/engagement/quick-picks";
  
  const res = await getJson<Envelope<QuickPicksResponse> | QuickPicksResponse>(url);

  // Handle wrapped response format: { success: true, data: { userIds, profiles } }
  const envelope: QuickPicksResponse =
    res && typeof res === "object" && "data" in res
      ? (res.data ?? {})
      : ((res as QuickPicksResponse) ?? {});
  const userIds = Array.isArray(envelope.userIds) ? envelope.userIds : [];
  const rawProfiles = Array.isArray(envelope.profiles) ? envelope.profiles : [];

  // Transform profiles to have imageUrl from profileImageUrls
  const profiles: QuickPickProfile[] = rawProfiles.map((p: EnrichedProfile) => ({
    userId: p.userId || p._id || p.id || "",
    fullName: p.fullName || null,
    city: p.city || null,
    imageUrl: Array.isArray(p.profileImageUrls) && p.profileImageUrls.length > 0
      ? p.profileImageUrls[0]
      : (p.imageUrl || null),
  })).filter((profile) => profile.userId.length > 0);

  return { userIds, profiles };
}

export async function actOnQuickPick(
  toUserId: string,
  action: "like" | "skip"
): Promise<{ success: boolean }> {
  return postJson("/api/engagement/quick-picks", { toUserId, action });
}

export type Icebreaker = {
  id: string;
  text: string;
  answered?: boolean;
  answer?: string;
};

export async function fetchIcebreakers(): Promise<Icebreaker[]> {
  const res = await getJson<IcebreakersResponse | Icebreaker[]>("/api/icebreakers");
  // Support both enveloped and plain array responses
  if (res && typeof res === "object" && !Array.isArray(res) && Array.isArray((res as IcebreakersResponse).data)) {
    return (res as IcebreakersResponse).data as Icebreaker[];
  }
  if (Array.isArray(res)) return res as unknown as Icebreaker[];
  return [];
}

export async function answerIcebreaker(
  questionId: string,
  answer: string
): Promise<{ success: boolean }> {
  const res = await postJson<{ success: boolean; data?: Record<string, unknown> }>(
    "/api/icebreakers/answer",
    { questionId, answer }
  );
  if (res.success) return { success: true };
  return { success: false };
}


