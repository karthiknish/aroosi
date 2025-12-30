import { NextRequest } from "next/server";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
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
import { db, adminAuth } from "@/lib/firebaseAdmin";
import { sendUserNotification } from "@/lib/email";
import type { Profile } from "@aroosi/shared/types";
import { renderMarketingReactTemplate } from "@/lib/reactEmailRenderers";
import { renderTemplate as renderCustomTemplate } from "@/lib/marketingTemplateRegistry";
import { renderBuiltTemplate } from "@/lib/templateBuilder";
import { getPublicBaseUrl, hashEmail } from "@/lib/tracking";
import { buildListUnsubscribeHeaders, isUnsubscribed } from "@/lib/unsubscribe";

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

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdminSession(request);
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
      exportCsv,
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
      // new audience filters
      lastActiveDays,
      lastActiveFrom,
      lastActiveTo,
      completionMin,
      completionMax,
      city,
      country,
      createdAtFrom,
      createdAtTo,
      sendToAllFromAuth,
      // deprecated isProfileComplete removed; optional future filters: isOnboardingComplete
      page,
      pageSize,
      sortBy,
      sortDir,
      priority,
      listId,
    } = (body || {}) as {
      templateKey?: string;
      params?: { args?: unknown[] };
      dryRun?: boolean;
      exportCsv?: boolean;
      confirm?: boolean;
      maxAudience?: number;
      subject?: string;
      body?: string;
      preheader?: string;
      abTest?: { subjects: [string, string]; ratio?: number };
      search?: string;
      plan?: string;
      banned?: string;
      lastActiveDays?: number;
      lastActiveFrom?: number;
      lastActiveTo?: number;
      completionMin?: number;
      completionMax?: number;
      city?: string | string[];
      country?: string | string[];
      createdAtFrom?: number;
      createdAtTo?: number;
      // deprecated isProfileComplete?: string;
      page?: number;
      pageSize?: number;
      sendToAll?: boolean;
      sendToAllFromAuth?: boolean;
      sortBy?: string;
      sortDir?: string;
      priority?: "high" | "normal" | "low";
      listId?: string;
    };

    if (!templateKey && !subject) {
      return errorResponse("Provide a templateKey or custom subject/body", 400);
    }
    if (templateKey && !(templateKey in TEMPLATE_MAP)) {
      return errorResponse("Invalid template", 400, {
        details: { field: "templateKey" },
      });
    }

    // Safety switches: require confirm for live send; enforce audience cap
    const effectiveMax = Number.isFinite(maxAudience)
      ? Math.max(1, Math.min(10000, Number(maxAudience)))
      : 1000;
    if (!dryRun && confirm !== true) {
      return errorResponse("Confirmation required for live send", 400, {
        details: { hint: "Pass confirm: true or use dryRun: true" },
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
        subscriptionPlan: u.subscriptionPlan,
        banned: !!u.banned,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt,
        profileCompletionPercentage: u.profileCompletionPercentage,
        city: u.location?.city || u.city,
        country: u.location?.country || u.country,
      } as Partial<Profile> & {
        email?: string;
        banned?: boolean;
        subscriptionPlan?: string;
        createdAt?: number;
        updatedAt?: number;
        lastLoginAt?: number;
        profileCompletionPercentage?: number;
        city?: string;
        country?: string;
      };
    };

    let profiles: Array<Partial<Profile> & { email?: string }>;
    // If sendToAll is requested, paginate through users using cursors
    if (sendToAllFromAuth) {
      // Fetch from Firebase Auth user registry (up to effectiveMax)
      profiles = [];
      let nextPageToken: string | undefined = undefined;
      let fetched = 0;
      while (fetched < effectiveMax) {
        const page = await adminAuth.listUsers(1000, nextPageToken);
        for (const u of page.users) {
          const email = u.email || undefined;
          if (!email) continue;
          profiles.push({ email } as any);
          fetched += 1;
          if (fetched >= effectiveMax) break;
        }
        nextPageToken = page.pageToken || undefined;
        if (!nextPageToken) break;
      }
    } else if (sendToAll) {
      profiles = [];
      let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      let fetched = 0;
      while (fetched < effectiveMax) {
        let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
          db.collection("users");
        if (plan) q = q.where("subscriptionPlan", "==", plan);
        if (banned === "true") q = q.where("banned", "==", true);
        if (Number.isFinite(createdAtFrom))
          q = q.where("createdAt", ">=", Number(createdAtFrom));
        if (Number.isFinite(createdAtTo))
          q = q.where("createdAt", "<=", Number(createdAtTo));
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
      if (Number.isFinite(createdAtFrom))
        queryRef = queryRef.where("createdAt", ">=", Number(createdAtFrom));
      if (Number.isFinite(createdAtTo))
        queryRef = queryRef.where("createdAt", "<=", Number(createdAtTo));
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
    // removed isProfileComplete filtering; apply new filters client requested
    if (plan) profiles = profiles.filter((p) => p.subscriptionPlan === plan);
    if (banned === "true") profiles = profiles.filter((p) => p.banned === true);
    if (banned === "false")
      profiles = profiles.filter((p) => p.banned !== true);
    // last active filters
    if (Number.isFinite(lastActiveDays)) {
      const cutoff = Date.now() - Number(lastActiveDays) * 24 * 60 * 60 * 1000;
      profiles = profiles.filter(
        (p: any) => !p.lastLoginAt || p.lastLoginAt <= cutoff
      );
    }
    if (Number.isFinite(lastActiveFrom)) {
      profiles = profiles.filter(
        (p: any) => (p.lastLoginAt ?? 0) >= Number(lastActiveFrom)
      );
    }
    if (Number.isFinite(lastActiveTo)) {
      profiles = profiles.filter(
        (p: any) => (p.lastLoginAt ?? 0) <= Number(lastActiveTo)
      );
    }
    // completion percentage
    if (Number.isFinite(completionMin)) {
      profiles = profiles.filter(
        (p: any) =>
          Number(p.profileCompletionPercentage ?? 0) >= Number(completionMin)
      );
    }
    if (Number.isFinite(completionMax)) {
      profiles = profiles.filter(
        (p: any) =>
          Number(p.profileCompletionPercentage ?? 0) <= Number(completionMax)
      );
    }
    // location filters (string match, case-insensitive)
    const citySet = Array.isArray(city)
      ? new Set((city as string[]).map((s) => s.toLowerCase()))
      : typeof city === "string" && city.trim()
        ? new Set([city.toLowerCase()])
        : null;
    const countrySet = Array.isArray(country)
      ? new Set((country as string[]).map((s) => s.toLowerCase()))
      : typeof country === "string" && country.trim()
        ? new Set([country.toLowerCase()])
        : null;
    if (citySet)
      profiles = profiles.filter(
        (p: any) => p.city && citySet.has(String(p.city).toLowerCase())
      );
    if (countrySet)
      profiles = profiles.filter(
        (p: any) => p.country && countrySet.has(String(p.country).toLowerCase())
      );
    // createdAt range (additional guard if not handled in query)
    if (Number.isFinite(createdAtFrom))
      profiles = profiles.filter(
        (p: any) => (p.createdAt ?? 0) >= Number(createdAtFrom)
      );
    if (Number.isFinite(createdAtTo))
      profiles = profiles.filter(
        (p: any) => (p.createdAt ?? 0) <= Number(createdAtTo)
      );
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

    const appendTrackingToHtml = (
      html: string,
      campaignId: string,
      email: string,
      extraParams: Record<string, string>
    ) => {
      const base = getPublicBaseUrl();
      const eid = hashEmail(email);
      const tracked = html.replace(
        /<a\s+([^>]*?)href=("|')(https?:[^"']+)(\2)([^>]*)>/gi,
        (m, pre, quote, url, _quote2, post) => {
          try {
            const target = new URL(url);
            target.searchParams.set("utm_source", "email");
            target.searchParams.set("utm_medium", "marketing");
            if (templateKey)
              target.searchParams.set("utm_campaign", templateKey);
            for (const [k, v] of Object.entries(extraParams))
              target.searchParams.set(k, v);
            const redirect = new URL(`${base}/api/admin/email/tracking/click`);
            redirect.searchParams.set("url", target.toString());
            redirect.searchParams.set("cid", campaignId);
            redirect.searchParams.set("eid", eid);
            const newHref = `${quote}${redirect.toString()}${quote}`;
            return `<a ${pre}href=${newHref}${post}>`;
          } catch {
            return m;
          }
        }
      );
      // Add open pixel just before closing body or at end
      const pixelUrl = `${base}/api/admin/email/tracking/open?cid=${encodeURIComponent(campaignId)}&eid=${encodeURIComponent(eid)}`;
      const pixelTag = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;" />`;
      if (tracked.match(/<\/body>/i))
        return tracked.replace(/<\/body>/i, `${pixelTag}</body>`);
      return tracked + pixelTag;
    };

    // If dryRun, return preview count and first few preview payloads
    if (dryRun) {
      type Preview = { email?: string; subject: string; abVariant?: "A" | "B" };
      const previews: Preview[] = [];
      const sample = finalProfiles.slice(0, Math.min(10, finalProfiles.length));
      const ratio = Math.max(1, Math.min(99, Number(abTest?.ratio ?? 50)));
      const aCount = Math.round((sample.length * ratio) / 100);
      if (exportCsv) {
        // Produce CSV of the full filtered list
        const cols = [
          "email",
          "fullName",
          "createdAt",
          "updatedAt",
          "lastLoginAt",
          "profileCompletionPercentage",
          "city",
          "country",
        ];
        const lines = [cols.join(",")];
        for (const p of finalProfiles) {
          const row = [
            String((p as any).email || ""),
            JSON.stringify(String((p as any).fullName || "")),
            String((p as any).createdAt || ""),
            String((p as any).updatedAt || ""),
            String((p as any).lastLoginAt || ""),
            String((p as any).profileCompletionPercentage ?? ""),
            JSON.stringify(String((p as any).city || "")),
            JSON.stringify(String((p as any).country || "")),
          ];
          lines.push(row.join(","));
        }
        const csv = lines.join("\n");
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="audience.csv"',
          },
        });
      }
      for (let i = 0; i < sample.length; i++) {
        const p = sample[i];
        // Guard missing fields for type safety
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        // Prefer React renderer for TSX templates, with graceful fallback to string templates
        let payload: { subject: string; html: string } | null = null;
        if (templateKey) {
          payload = renderMarketingReactTemplate(
            templateKey,
            {
              ...(params || {}),
              completionPercentage:
                (baseProfile as any).profileCompletionPercentage || 0,
            },
            { profile: baseProfile, unsubscribeToken: "" }
          );
        }
        if (!payload) {
          payload = templateFn
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
        }

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

    // Create a campaign document for admin history
    const campaignRef = await db.collection("marketing_email_campaigns").add({
      status: "processing",
      templateKey: templateKey || null,
      subject: subject || null,
      hasCustom: Boolean(subject || customBody),
      maxAudience: effectiveMax,
      abTest:
        abTest && abTest.subjects
          ? {
              subjects: abTest.subjects,
              ratio: Math.max(1, Math.min(99, Number(abTest.ratio ?? 50))),
            }
          : null,
      createdAt: Date.now(),
      startedBy: userId,
      totalCandidates: finalProfiles.length,
      sent: 0,
      errors: 0,
      lastError: null,
      settings: {
        priority:
          priority && ["high", "normal", "low"].includes(priority)
            ? priority
            : undefined,
        listId: typeof listId === "string" ? listId : undefined,
      },
    });

    let sent = 0;
    let errors = 0;
    let skippedUnsubscribed = 0;
    const ratio = Math.max(1, Math.min(99, Number(abTest?.ratio ?? 50)));
    const aCount = Math.round((finalProfiles.length * ratio) / 100);
    // Basic HTML validator for links/images/unsubscribe headers
    function validateEmailHtml(
      html: string,
      headers: Record<string, string>
    ): { ok: boolean; issues: string[] } {
      const issues: string[] = [];
      // Unsubscribe headers present
      if (!headers["List-Unsubscribe"])
        issues.push("Missing List-Unsubscribe header");
      if (!headers["List-Unsubscribe-Post"])
        issues.push("Missing List-Unsubscribe-Post header");
      // Validate links
      const linkRe = /<a\s+[^>]*href=("|')([^"']+)(\1)/gi;
      let m: RegExpExecArray | null;
      let linkCount = 0;
      while ((m = linkRe.exec(html)) !== null) {
        linkCount++;
        try {
          const u = new URL(m[2]);
          if (!(u.protocol === "http:" || u.protocol === "https:"))
            issues.push(`Invalid link protocol: ${m[2]}`);
        } catch {
          issues.push(`Invalid link URL: ${m[2]}`);
        }
      }
      if (linkCount === 0) issues.push("No links found in email");
      // Validate images (if present)
      const imgRe = /<img\s+[^>]*src=("|')([^"']+)(\1)/gi;
      while ((m = imgRe.exec(html)) !== null) {
        try {
          const u = new URL(m[2]);
          if (!(u.protocol === "http:" || u.protocol === "https:"))
            issues.push(`Invalid image protocol: ${m[2]}`);
        } catch {
          // allow data: URLs for inline images
          if (!m[2].startsWith("data:"))
            issues.push(`Invalid image URL: ${m[2]}`);
        }
      }
      return { ok: issues.length === 0, issues };
    }

    for (let i = 0; i < finalProfiles.length; i++) {
      const p = finalProfiles[i];
      try {
        const baseProfile = {
          ...(p as Profile),
          email: p.email || "",
          fullName: (p as Profile).fullName || "",
        } as Profile;

        let emailPayload: { subject: string; html: string } | null = null;
        if (templateKey) {
          // Try custom registry first for override
          const reg = renderCustomTemplate(
            templateKey,
            {
              ...(params || {}),
              completionPercentage:
                (baseProfile as any).profileCompletionPercentage || 0,
            },
            { profile: baseProfile, unsubscribeToken: "" }
          );
          if (reg) emailPayload = reg;
          // Declarative builder path (templateKey === 'builder' and a builder schema provided in params)
          if (
            !emailPayload &&
            templateKey === "builder" &&
            params &&
            (params as any).schema
          ) {
            try {
              const built = renderBuiltTemplate((params as any).schema);
              emailPayload = {
                subject: built.subject || subject || "(no subject)",
                html: built.html,
              };
            } catch {}
          }
          // Fallback to React built-ins
          if (!emailPayload) {
            emailPayload = renderMarketingReactTemplate(
              templateKey,
              {
                ...(params || {}),
                completionPercentage:
                  (baseProfile as any).profileCompletionPercentage || 0,
              },
              { profile: baseProfile, unsubscribeToken: "" }
            );
          }
        }
        if (!emailPayload) {
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
          // Tracking links and metadata
          const campaignId = campaignRef.id as string;
          const abVariant =
            abTest &&
            abTest.subjects &&
            abTest.subjects[0] &&
            abTest.subjects[1]
              ? i < aCount
                ? "A"
                : "B"
              : undefined;
          const trackedHtml = appendTrackingToHtml(
            emailPayload.html,
            campaignId,
            p.email,
            abVariant ? { ab: abVariant } : {}
          );
          // Respect unsubscribes (global or category-specific)
          const eid = hashEmail(p.email);
          if (await isUnsubscribed(eid, "marketing")) {
            skippedUnsubscribed += 1;
            continue;
          }
          const listHeaders = buildListUnsubscribeHeaders({
            eid,
            cid: campaignId,
            category: "marketing",
          });
          // Pre-send validation
          const validation = validateEmailHtml(trackedHtml, listHeaders);
          if (!validation.ok) {
            throw new Error(
              `Email validation failed: ${validation.issues.join("; ")}`
            );
          }
          await sendUserNotification(
            p.email,
            emailPayload.subject,
            trackedHtml,
            {
              preheader,
              category: "marketing",
              campaignId,
              tags: ["marketing", templateKey || "custom"],
              abVariant,
              headers: listHeaders,
              priority:
                priority && ["high", "normal", "low"].includes(priority)
                  ? priority
                  : undefined,
              listId: typeof listId === "string" ? listId : undefined,
            }
          );
          sent += 1;
          if (sent % 25 === 0) {
            await campaignRef.set(
              { sent, updatedAt: Date.now() },
              { merge: true }
            );
          }
        }
      } catch (err: any) {
        devLog("warn", "admin.marketing-email", "send_error", {
          email: p.email,
        });
        errors += 1;
        await campaignRef.set(
          {
            errors,
            lastError: err?.message || String(err),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    }

    await campaignRef.set(
      {
        status: "completed",
        sent,
        skippedUnsubscribed,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

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
