import { getJson, postJson } from "@/lib/http/client";

export type ShortlistEntry = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  createdAt: number;
};

export async function fetchShortlists(): Promise<ShortlistEntry[]> {
  return getJson<ShortlistEntry[]>("/api/engagement/shortlist");
}

export async function toggleShortlist(toUserId: string): Promise<{ success: boolean; added?: boolean; removed?: boolean }> {
  try {
    return await postJson("/api/engagement/shortlist", { toUserId });
  } catch (e: any) {
    const msg = e?.message || "Failed to update shortlist";
    // Surface limit errors as-is for toasts
    throw new Error(msg);
  }
}

export async function fetchNote(toUserId: string): Promise<{ note?: string; updatedAt?: number } | null> {
  return getJson(`/api/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`);
}

export async function setNote(toUserId: string, note: string): Promise<{ success: boolean }> {
  try {
    return await postJson("/api/engagement/notes", { toUserId, note });
  } catch (e: any) {
    const msg = e?.message || "Failed to save note";
    throw new Error(msg);
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
  const url = dayKey
    ? `/api/engagement/quick-picks?day=${encodeURIComponent(dayKey)}`
    : "/api/engagement/quick-picks";
  return getJson(url);
}

export async function actOnQuickPick(toUserId: string, action: "like" | "skip"): Promise<{ success: boolean }> {
  return postJson("/api/engagement/quick-picks", { toUserId, action });
}

export async function enrichProfiles(userIds: string[]): Promise<QuickPickProfile[]> {
  return postJson("/api/engagement/profiles", { userIds });
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


