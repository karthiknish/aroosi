import crypto from "crypto";
import { db } from "@/lib/firebaseAdmin";
import { getPublicBaseUrl } from "@/lib/tracking";

const SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.TRACKING_SALT || process.env.FIREBASE_PROJECT_ID || "aroosi_default_secret";

export function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function buildUnsubscribeUrl(params: { eid: string; cid?: string; category?: string }): string {
  const base = getPublicBaseUrl();
  const sig = sign(params.eid);
  const url = new URL(`${base}/api/email/unsubscribe`);
  url.searchParams.set("eid", params.eid);
  url.searchParams.set("sig", sig);
  if (params.cid) url.searchParams.set("cid", params.cid);
  if (params.category) url.searchParams.set("cat", params.category);
  return url.toString();
}

export function buildListUnsubscribeHeaders(params: { eid: string; cid?: string; category?: string }) {
  const url = buildUnsubscribeUrl(params);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  } as const;
}

export async function isUnsubscribed(eid: string, category?: string): Promise<boolean> {
  const snap = await db.collection("email_unsubscribes").doc(eid).get();
  if (!snap.exists) return false;
  const d = snap.data() as any;
  if (d?.unsubscribed) return true;
  if (category && d?.categories && d.categories[category]) return true;
  return false;
}

export async function recordUnsubscribe(eid: string, via: "link" | "one-click", cid?: string, category?: string) {
  const ref = db.collection("email_unsubscribes").doc(eid);
  const update: any = {
    updatedAt: Date.now(),
    via,
    campaigns: cid ? { [cid]: true } : {},
  };
  if (category) {
    update.categories = { [category]: true };
  } else {
    update.unsubscribed = true;
  }
  await ref.set(update, { merge: true });
}
