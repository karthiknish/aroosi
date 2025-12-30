import { getJson, postJson } from "@/lib/http/client";

export type ShortlistEntry = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  createdAt: number;
};

export async function fetchShortlists(): Promise<ShortlistEntry[]> {
  try {
    const res = await getJson<{ success?: boolean; data?: ShortlistEntry[] }>(
      "/api/engagement/shortlist"
    );
    if (Array.isArray((res as any)?.data))
      return (res as any).data as ShortlistEntry[];
    if (Array.isArray(res)) return res as unknown as ShortlistEntry[];
    return [];
  } catch {
    return [];
  }
}

export async function toggleShortlist(
  toUserId: string
): Promise<{ success: boolean; added?: boolean; removed?: boolean }> {
  try {
    return await postJson("/api/engagement/shortlist", { toUserId });
  } catch (e: any) {
    const msg = e?.message || "Failed to update shortlist";
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
    const res = await postJson("/api/engagement/quick-picks", { userIds });
    const list = (res as any)?.data || res;
    if (!Array.isArray(list)) return [];
    return list.map((p: any) => ({
      userId: p.userId || p._id,
      fullName: p.fullName || null,
      city: p.city || null,
      imageUrl: Array.isArray(p.profileImageUrls)
        ? p.profileImageUrls[0]
        : null,
    }));
  } catch {
    return [];
  }
}

export async function fetchNote(
  toUserId: string
): Promise<{ note?: string; updatedAt?: number } | null> {
  try {
    const res = await getJson(
      `/api/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`
    );
    return (res as any)?.data || res || null;
  } catch {
    return null;
  }
}

export async function setNote(
  toUserId: string,
  note: string
): Promise<boolean> {
  try {
    const res = await postJson("/api/engagement/notes", { toUserId, note });
    return !!(res as any)?.success;
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

export async function getQuickPicks(
  dayKey?: string
): Promise<{ userIds: string[]; profiles: QuickPickProfile[] }> {
  try {
    const url = dayKey
      ? `/api/engagement/quick-picks?day=${encodeURIComponent(dayKey)}`
      : "/api/engagement/quick-picks";
    const res = await getJson<any>(url);

    // Handle wrapped response format: { success: true, data: { userIds, profiles } }
    const envelope = res?.data ?? res;
    const userIds = Array.isArray(envelope?.userIds) ? envelope.userIds : [];
    const rawProfiles = Array.isArray(envelope?.profiles) ? envelope.profiles : [];

    // Transform profiles to have imageUrl from profileImageUrls
    const profiles: QuickPickProfile[] = rawProfiles.map((p: any) => ({
      userId: p.userId || p._id || p.id,
      fullName: p.fullName || null,
      city: p.city || null,
      imageUrl: Array.isArray(p.profileImageUrls) && p.profileImageUrls.length > 0
        ? p.profileImageUrls[0]
        : (p.imageUrl || null),
    }));

    return { userIds, profiles };
  } catch {
    // Return empty data on error to prevent page crashes
    return { userIds: [], profiles: [] };
  }
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
  const res = await getJson<{
    success: boolean;
    data?: Icebreaker[];
  }>("/api/icebreakers");
  // Support both enveloped and plain array responses
  if (Array.isArray((res as any).data))
    return (res as any).data as Icebreaker[];
  if (Array.isArray(res)) return res as unknown as Icebreaker[];
  return [];
}

export async function answerIcebreaker(
  questionId: string,
  answer: string
): Promise<{ success: boolean }> {
  const res = await postJson<{ success: boolean; data?: any }>(
    "/api/icebreakers/answer",
    { questionId, answer }
  );
  if ((res as any).success) return { success: true };
  return { success: false };
}


