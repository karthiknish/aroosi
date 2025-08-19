import { NextRequest } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  MarketingEmailTemplateFn,
  profileCompletionReminderTemplate,
  premiumPromoTemplate,
  recommendedProfilesTemplate,
  reEngagementTemplate,
  successStoryTemplate,
  weeklyMatchesDigestTemplate,
  welcomeDay1Template,
} from "@/lib/marketingEmailTemplates";
import { db } from "@/lib/firebaseAdmin";
import { sendUserNotification } from "@/lib/email";
import type { Profile } from "@/types/profile";

const TEMPLATE_MAP: Record<string, MarketingEmailTemplateFn> = {
  profileCompletionReminder:
    profileCompletionReminderTemplate as unknown as MarketingEmailTemplateFn,
  premiumPromo: premiumPromoTemplate as unknown as MarketingEmailTemplateFn,
  recommendedProfiles:
    recommendedProfilesTemplate as unknown as MarketingEmailTemplateFn,
  reEngagement: reEngagementTemplate as unknown as MarketingEmailTemplateFn,
  successStory: successStoryTemplate as unknown as MarketingEmailTemplateFn,
  weeklyDigest:
    weeklyMatchesDigestTemplate as unknown as MarketingEmailTemplateFn,
  welcomeDay1: welcomeDay1Template as unknown as MarketingEmailTemplateFn,
};

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdminSession(
      request as unknown as NextRequest
    );
    if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
    const { userId } = adminCheck;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const {
      templateKey,
      params,
      dryRun,
      confirm,
      maxAudience,
      sendToAll,
      subject,
      body: customBody,
      preheader,
      abTest,
      search,
      plan,
      banned,
      // deprecated isProfileComplete removed; optional future filters: isOnboardingComplete
      page,
      pageSize,
      sortBy,
      sortDir,
    } = (body || {}) as {
      templateKey?: string;
      params?: { args?: unknown[] };
      dryRun?: boolean;
      confirm?: boolean;
      maxAudience?: number;
      subject?: string;
      body?: string;
      preheader?: string;
      abTest?: { subjects: [string, string]; ratio?: number };
      search?: string;
      plan?: string;
      banned?: string;
      // deprecated isProfileComplete?: string;
      page?: number;
      pageSize?: number;
      sendToAll?: boolean;
      sortBy?: string;
      sortDir?: string;
    };

    if (!templateKey && !subject) {
      return errorResponse("Provide a templateKey or custom subject/body", 400);
    }
    if (templateKey && !(templateKey in TEMPLATE_MAP)) {
      return errorResponse("Invalid template", 400, { field: "templateKey" });
    }

    // Safety switches: require confirm for live send; enforce audience cap
    const effectiveMax = Number.isFinite(maxAudience)
      ? Math.max(1, Math.min(10000, Number(maxAudience)))
      : 1000;
    if (!dryRun && confirm !== true) {
      return errorResponse("Confirmation required for live send", 400, {
        hint: "Pass confirm: true or use dryRun: true",
      });
    }

    // Audience selection with filtering + pagination
    const primaryLimit = Math.min(effectiveMax, 5000); // guard
    const sortField = ["createdAt", "updatedAt", "subscriptionPlan"].includes(
      String(sortBy)
    )
      ? (sortBy as string)
      : "createdAt";
    const dir = String(sortDir).toLowerCase() === "asc" ? "asc" : "desc";

    // Helper to map user doc to profile-like object
    const mapDoc = (
      d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    ) => {
      const u = d.data() as Record<string, any>;
      return {
        email: u.email,
        fullName: u.fullName,
        aboutMe: u.aboutMe,
        profileImageUrls: Array.isArray(u.profileImageUrls)
          ? (u.profileImageUrls as string[])
          : [],
        images: u.images,
        interests: u.interests,
        isOnboardingComplete: !!u.isOnboardingComplete,
        subscriptionPlan: u.subscriptionPlan,
        banned: !!u.banned,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      } as Partial<Profile> & {
        email?: string;
        banned?: boolean;
        subscriptionPlan?: string;
        createdAt?: number;
        updatedAt?: number;
      };
    };

    let profiles: Array<Partial<Profile> & { email?: string }>;
    // If sendToAll is requested, paginate through users using cursors
    if (sendToAll) {
      profiles = [];
      let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      let fetched = 0;
      while (fetched < effectiveMax) {
        let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
          db.collection("users");
        if (plan) q = q.where("subscriptionPlan", "==", plan);
        if (banned === "true") q = q.where("banned", "==", true);
        try {
          q = q.orderBy(sortField, dir as any);
        } catch {}
        q = q.limit(Math.min(500, effectiveMax - fetched));
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        for (const d of snap.docs) {
          profiles.push(mapDoc(d));
          fetched += 1;
          if (fetched >= effectiveMax) break;
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < 1) break;
      }
    } else {
      let queryRef: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        db.collection("users");
      if (plan) queryRef = queryRef.where("subscriptionPlan", "==", plan);
      if (banned === "true") queryRef = queryRef.where("banned", "==", true);
      try {
        queryRef = queryRef.orderBy(sortField, dir as any);
      } catch {}
      const usersSnap = await queryRef.limit(primaryLimit).get();
      profiles = usersSnap.docs.map(mapDoc);
    }
    const term = (search || "").trim().toLowerCase();
    if (term) {
      profiles = profiles.filter(
        (p) =>
          (p.fullName && String(p.fullName).toLowerCase().includes(term)) ||
          (p.aboutMe && String(p.aboutMe).toLowerCase().includes(term))
      );
    }
    // removed isProfileComplete filtering
    if (plan) profiles = profiles.filter((p) => p.subscriptionPlan === plan);
    if (banned === "true") profiles = profiles.filter((p) => p.banned === true);
    if (banned === "false")
      profiles = profiles.filter((p) => p.banned !== true);
    // Secondary sort (stable)
    const dirMul = dir === "asc" ? 1 : -1;
    profiles.sort((a: any, b: any) => {
      const av = a?.[sortField] ?? 0;
      const bv = b?.[sortField] ?? 0;
      return av === bv ? 0 : av > bv ? dirMul : -dirMul;
    });
    const safePageSize = Math.min(
      Math.max(pageSize ?? effectiveMax, 1),
      effectiveMax
    );
    const safePage = Math.max(page ?? 1, 1);
    const start = (safePage - 1) * safePageSize;
    const finalProfiles = profiles
      .slice(start, start + safePageSize)
      .slice(0, effectiveMax);

    const templateFn = templateKey ? TEMPLATE_MAP[templateKey] : null;

    // If dryRun, return preview count and first few preview payloads
    if (dryRun) {
      type Preview = { email?: string; subject: string; abVariant?: "A" | "B" };
      const previews: Preview[] = [];
      const sample = finalProfiles.slice(0, Math.min(10, finalProfiles.length));
      const ratio = Math.max(1, Math.min(99, Number(abTest?.ratio ?? 50)));
      const aCount = Math.round((sample.length * ratio) / 100);
      for (let i = 0; i < sample.length; i++) {
        const p = sample[i];
        // Guard missing fields for type safety
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        const payload = templateFn
          ? templateKey === "profileCompletionReminder"
            ? templateFn(
                baseProfile,
                baseProfile.profileCompletionPercentage || 0,
                ""
              )
            : templateKey === "premiumPromo"
              ? templateFn(baseProfile, 30, "")
              : templateKey === "recommendedProfiles"
                ? templateFn(baseProfile, [], "")
                : templateFn(
                    baseProfile,
                    ...((params?.args || []) as unknown[]),
                    ""
                  )
          : { subject: subject || "(no subject)", html: customBody || "" };

        let finalSubject = payload.subject;
        let abVariant: "A" | "B" | undefined;
        if (
          abTest &&
          abTest.subjects &&
          abTest.subjects[0] &&
          abTest.subjects[1]
        ) {
          const useA = i < aCount;
          finalSubject = useA ? abTest.subjects[0] : abTest.subjects[1];
          abVariant = useA ? "A" : "B";
        }
        previews.push({ email: p.email, subject: finalSubject, abVariant });
      }
      return successResponse({
        dryRun: true,
        totalCandidates: profiles.length,
        previewCount: previews.length,
        previews,
        maxAudience: effectiveMax,
        actorId: userId,
        page: safePage,
        pageSize: safePageSize,
        abTest:
          abTest && abTest.subjects
            ? {
                subjects: abTest.subjects,
                ratio: Math.max(1, Math.min(99, Number(abTest.ratio ?? 50))),
              }
            : undefined,
      });
    }

    // Live send with batching (simple sequential loop retained, can optimize later)
    // Campaign start log (optional persistence)
    devLog("info", "admin.marketing-email", "campaign_start", {
      templateKey,
      hasCustom: Boolean(subject || customBody),
      maxAudience: effectiveMax,
      abTest:
        abTest && abTest.subjects
          ? {
              subjects: abTest.subjects,
              ratio: Math.max(1, Math.min(99, Number(abTest.ratio ?? 50))),
            }
          : undefined,
    });

    let sent = 0;
    const ratio = Math.max(1, Math.min(99, Number(abTest?.ratio ?? 50)));
    const aCount = Math.round((finalProfiles.length * ratio) / 100);
    for (let i = 0; i < finalProfiles.length; i++) {
      const p = finalProfiles[i];
      try {
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        let emailPayload: { subject: string; html: string } | null = null;
        if (templateFn) {
          if (templateKey === "profileCompletionReminder") {
            emailPayload = templateFn(
              baseProfile,
              baseProfile.profileCompletionPercentage || 0,
              ""
            );
          } else if (templateKey === "premiumPromo") {
            const promoDays =
              Array.isArray(params?.args) &&
              typeof params!.args![0] === "number"
                ? (params!.args![0] as number)
                : 30;
            emailPayload = templateFn(baseProfile, promoDays, "");
          } else if (templateKey === "recommendedProfiles") {
            // Optional: enrichment omitted in live send for safety; can be added behind a smaller cap
            emailPayload = templateFn(baseProfile, [], "");
          } else {
            emailPayload = templateFn(
              baseProfile,
              ...((params?.args || []) as unknown[]),
              ""
            );
          }
        } else {
          emailPayload = {
            subject: subject || "(no subject)",
            html: customBody || "",
          };
        }
        // A/B subject override
        if (
          abTest &&
          abTest.subjects &&
          abTest.subjects[0] &&
          abTest.subjects[1]
        ) {
          const useA = i < aCount;
          emailPayload.subject = useA ? abTest.subjects[0] : abTest.subjects[1];
        }

        // Preheader injection (hidden preheader at top of body)
        if (preheader && preheader.trim()) {
          const pre = `<div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent">${preheader.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
          const bodyOpen = emailPayload.html.match(/<body[^>]*>/i);
          if (bodyOpen && bodyOpen.index != null) {
            const idx = bodyOpen.index + bodyOpen[0].length;
            emailPayload.html =
              emailPayload.html.slice(0, idx) +
              pre +
              emailPayload.html.slice(idx);
          } else {
            emailPayload.html = pre + emailPayload.html;
          }
        }

        if (p.email) {
          await sendUserNotification(
            p.email,
            emailPayload.subject,
            emailPayload.html
          );
          sent += 1;
        }
      } catch {
        devLog("warn", "admin.marketing-email", "send_error", {
          email: p.email,
        });
      }
    }

    return successResponse({
      dryRun: false,
      attempted: finalProfiles.length,
      sent,
      maxAudience: effectiveMax,
      actorId: userId,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (error) {
    devLog("error", "admin.marketing-email", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Unexpected error", 500);
  }
}
