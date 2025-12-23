import { db, adminStorage } from "@/lib/firebaseAdmin";
import type { Profile } from "@/types/profile";

export interface ListProfilesOptions {
  search?: string;
  page: number; // 1-based
  pageSize: number;
  sortBy: "createdAt" | "banned" | "subscriptionPlan";
  sortDir: "asc" | "desc";
  banned: "true" | "false" | "all";
  plan: "all" | "free" | "premium" | "premiumPlus";
}

export interface ListProfilesResult {
  profiles: (Profile & { _id: string })[];
  total: number;
}

// Firestore doesn't support arbitrary offset pagination efficiently; we use cursor-based pagination fallback.
// For now keep simple offset approach for small admin datasets (<5k). If larger, add cursor implementation.
export async function listProfiles(
  opts: ListProfilesOptions
): Promise<ListProfilesResult> {
  const { page, pageSize, search, sortBy, sortDir, banned, plan } = opts;
  let query: FirebaseFirestore.Query = db.collection("users");

  // Basic filters
  if (banned !== "all") {
    query = query.where("banned", "==", banned === "true");
  }
  if (plan !== "all") {
    query = query.where("subscriptionPlan", "==", plan);
  }
  // Search: naive approach on fullName or email (exact/startsWith). For startsWith we need range on lowercased field; assume we have stored fullNameLower.
  // If not present, do client-side filter post fetch limited to 500 docs.
  if (search) {
    const trimmed = search.toLowerCase();
    // Attempt to use fullNameLower prefix search if field exists.
    // Fallback: fetch up to 200 docs and filter in memory.
    // We'll implement fallback path.
    const nameFieldExists = true; // optimistic
    if (nameFieldExists) {
      // Firestore requires orderBy same field for range; we attempt prefix range.
      // NOTE: This requires index on users(fullNameLower asc)
      query = query
        .orderBy("fullNameLower")
        .startAt(trimmed)
        .endAt(trimmed + "\uf8ff");
    }
  } else {
    // Sorting
    if (sortBy === "createdAt") {
      query = query.orderBy("createdAt", sortDir);
    } else if (sortBy === "banned") {
      query = query.orderBy("banned", sortDir);
    } else if (sortBy === "subscriptionPlan") {
      query = query.orderBy("subscriptionPlan", sortDir);
    } else {
      query = query.orderBy("createdAt", "desc");
    }
  }

  // Offset pagination (inefficient for large offsets). Acceptable for small admin pages.
  const offset = (page - 1) * pageSize;
  // Firestore has no native offset in admin SDK older versions; use .offset if available or manual skip.
  let snapshot: FirebaseFirestore.QuerySnapshot;
  if (typeof (query as any).offset === "function") {
    snapshot = await (query as any).offset(offset).limit(pageSize).get();
  } else {
    const preSnap = await query.limit(offset + pageSize).get();
    const docs = preSnap.docs.slice(offset, offset + pageSize);
    snapshot = { docs } as unknown as FirebaseFirestore.QuerySnapshot;
  }

  const profiles = snapshot.docs.map((d: any) => ({
    _id: d.id,
    ...(d.data() as any),
  })) as (Profile & { _id: string })[];

  // Total count (expensive). For now count via aggregate if available; fallback to separate fetch capped at 10k.
  let total = profiles.length;
  try {
    if (
      typeof (db as any).collectionGroup === "function" &&
      (query as any).count
    ) {
      const agg = await (query as any).count().get();
      total = agg.data().count || total;
    } else {
      // fallback approximate
      const countSnap = await db
        .collection("users")
        .select()
        .limit(10000)
        .get();
      total = countSnap.size;
    }
  } catch {}

  // Post-filter search if simple fallback and search provided but no ordering used.
  if (search && !profiles.length) {
    const altSnap = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const all = altSnap.docs.map(
      (d: FirebaseFirestore.QueryDocumentSnapshot) => ({
        _id: d.id,
        ...(d.data() as any),
      })
    ) as any[];
    const lower = search.toLowerCase();
    const filtered = all.filter(
      (p) =>
        (p.fullName || "").toLowerCase().includes(lower) ||
        (p.email || "").toLowerCase().includes(lower)
    );
    return { profiles: filtered.slice(0, pageSize), total: filtered.length };
  }

  return { profiles, total };
}

export async function getProfileById(id: string): Promise<(Profile & { _id: string }) | null> {
  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return null;
  return { _id: doc.id, ...(doc.data() as any) } as any;
}

export async function updateProfileById(id: string, updates: Partial<Profile>): Promise<(Profile & { _id: string }) | null> {
  updates.updatedAt = Date.now();
  await db.collection("users").doc(id).set(updates, { merge: true });
  return getProfileById(id);
}

export async function deleteProfileById(id: string): Promise<boolean> {
  const profile = await getProfileById(id);
  if (!profile) return false;

  // 1. Delete user document
  await db.collection("users").doc(id).delete();

  // 2. Delete matches
  const matches1 = await db.collection("matches").where("user1Id", "==", id).get();
  const matches2 = await db.collection("matches").where("user2Id", "==", id).get();
  const matchDeletes = [...matches1.docs, ...matches2.docs].map((d: any) =>
    d.ref.delete()
  );
  await Promise.all(matchDeletes);

  // 3. Delete interests
  const interests1 = await db
    .collection("interests")
    .where("fromUserId", "==", id)
    .get();
  const interests2 = await db
    .collection("interests")
    .where("toUserId", "==", id)
    .get();
  const interestDeletes = [...interests1.docs, ...interests2.docs].map(
    (d: any) => d.ref.delete()
  );
  await Promise.all(interestDeletes);

  // 4. Delete messages
  const messages1 = await db
    .collection("messages")
    .where("fromUserId", "==", id)
    .get();
  const messages2 = await db
    .collection("messages")
    .where("toUserId", "==", id)
    .get();
  const messageDeletes = [...messages1.docs, ...messages2.docs].map((d: any) =>
    d.ref.delete()
  );
  await Promise.all(messageDeletes);

  // 5. Delete images from Storage
  const imageUrls = [
    ...(profile.profileImageUrls || []),
    ...(profile.images || []),
  ];
  const storageDeletes = imageUrls.map(async (url) => {
    try {
      // Extract path from URL if it's a Firebase Storage URL
      // Example: https://firebasestorage.googleapis.com/v0/b/[BUCKET]/o/[PATH]?alt=media
      const match = url.match(/\/o\/(.+)\?alt=media/);
      if (match && match[1]) {
        const path = decodeURIComponent(match[1]);
        await adminStorage.bucket().file(path).delete();
      }
    } catch (e) {
      console.error(`Failed to delete image: ${url}`, e);
    }
  });
  await Promise.all(storageDeletes);

  return true;
}
