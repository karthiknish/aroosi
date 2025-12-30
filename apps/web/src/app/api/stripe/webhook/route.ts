import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { Notifications } from "@/lib/notify";
import { logSecurityEvent } from "@/lib/utils/securityHeaders";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import Stripe from "stripe";
import {
  inferPlanFromSubscription,
  normaliseInternalPlan,
} from "@/lib/subscription/stripePlanMapping";

// Disable automatic body parsing in Next.js (app router) by reading raw body via req.text()
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = nowTimestamp();
  try {
    // Strict allowlist of event types we process; others are ignored early
    const ALLOWED_EVENT_TYPES: Readonly<Set<string>> = new Set([
      "checkout.session.completed",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "customer.subscription.created",
      "invoice.paid",
    ]);
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        { reason: "Missing signature", correlationId },
        req
      );
      console.warn("Stripe webhook missing signature", {
        scope: "stripe.webhook",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: nowTimestamp() - startedAt,
      });
      return NextResponse.json(
        { error: "Missing signature", correlationId },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe webhook secret not configured", {
        scope: "stripe.webhook",
        type: "config_error",
        correlationId,
        statusCode: 500,
        durationMs: nowTimestamp() - startedAt,
      });
      return NextResponse.json(
        { error: "Webhook configuration error", correlationId },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    const rawBody = await req.text();

    if (!rawBody || rawBody.length === 0) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        { reason: "Empty body", correlationId },
        req
      );
      console.warn("Stripe webhook empty body", {
        scope: "stripe.webhook",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: nowTimestamp() - startedAt,
      });
      return NextResponse.json(
        { error: "Empty request body", correlationId },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Stripe webhook signature verification failed", {
        scope: "stripe.webhook",
        type: "auth_failed",
        message,
        correlationId,
        statusCode: 400,
        durationMs: nowTimestamp() - startedAt,
      });

      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          reason: "Signature verification failed",
          error: message,
          correlationId,
        },
        req
      );

      return NextResponse.json(
        { error: "Webhook signature verification failed", correlationId },
        { status: 400 }
      );
    }

    // Enforce allowlist
    if (!ALLOWED_EVENT_TYPES.has(event.type)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        eventType: event.type,
        correlationId,
      });
    }

    if (!event.type || !event.data || !event.data.object) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        {
          reason: "Invalid event structure",
          eventType: event.type,
          correlationId,
        },
        req
      );
      console.warn("Stripe webhook invalid event structure", {
        scope: "stripe.webhook",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: nowTimestamp() - startedAt,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "Invalid webhook event", correlationId },
        { status: 400 }
      );
    }

    // Basic idempotency: store processed event IDs in a lightweight collection
    async function alreadyProcessed(id: string) {
      try {
        const doc = await db.collection("stripe_events").doc(id).get();
        return doc.exists;
      } catch {
        return false;
      }
    }
    async function markProcessed(id: string, type: string) {
      try {
        const ref = db.collection("stripe_events").doc(id);
        const snap = await ref.get();
        if (snap.exists) return; 
        const retentionDays = parseInt(
          process.env.STRIPE_EVENT_TTL_DAYS || "30",
          10
        );
        const now = new Date(nowTimestamp());
        const ttlAt = new Date(
          now.getTime() + retentionDays * 24 * 60 * 60 * 1000
        );
        await ref.create({
          type,
          processedAt: nowTimestamp(),
          createdAt: now,
          ttlAt, 
          retentionDays,
        }); 
      } catch (e) {
        if (!(e instanceof Error && /already exists/i.test(e.message))) {
          console.warn("Failed to mark stripe event processed", id, e);
        }
      }
    }

    async function safeMergeUserBilling(
      ref: FirebaseFirestore.DocumentReference,
      payload: {
        subscriptionPlan?: any;
        subscriptionExpiresAt?: number | null;
        subscriptionCancelAtPeriodEnd?: boolean;
        stripeCustomerId?: string | undefined;
        stripeSubscriptionId?: string | undefined;
      },
      options?: {
        allowReplaceSubIdIfCustomerMatches?: boolean;
        incomingCustomerId?: string;
      }
    ) {
      await db.runTransaction(async (tx: any) => {
        const doc = await tx.get(ref);
        if (!doc.exists) return; 
        const existing = doc.data() as any;
        const update: any = { updatedAt: nowTimestamp() };
        if (payload.subscriptionPlan !== undefined) {
          update.subscriptionPlan = payload.subscriptionPlan;
        }
        if (payload.subscriptionExpiresAt !== undefined) {
          update.subscriptionExpiresAt = payload.subscriptionExpiresAt;
        }
        if (payload.stripeCustomerId) {
          if (
            existing.stripeCustomerId &&
            existing.stripeCustomerId !== payload.stripeCustomerId
          ) {
            console.warn("Stripe webhook: stripeCustomerId mismatch", {
              userId: ref.id,
              existing: existing.stripeCustomerId,
              incoming: payload.stripeCustomerId,
              correlationId,
            });
          } else if (!existing.stripeCustomerId) {
            update.stripeCustomerId = payload.stripeCustomerId;
          }
        }
        if (payload.stripeSubscriptionId) {
          if (
            existing.stripeSubscriptionId &&
            existing.stripeSubscriptionId !== payload.stripeSubscriptionId
          ) {
            const incomingCustomerId =
              options?.incomingCustomerId || payload.stripeCustomerId;
            const customersMatch =
              !!incomingCustomerId &&
              !!existing.stripeCustomerId &&
              existing.stripeCustomerId === incomingCustomerId;

            if (options?.allowReplaceSubIdIfCustomerMatches && customersMatch) {
              const priorHistory: string[] = Array.isArray(
                existing.stripeSubscriptionHistory
              )
                ? existing.stripeSubscriptionHistory
                : [];
              const newHistory = Array.from(
                new Set(
                  [
                    ...priorHistory,
                    existing.stripeSubscriptionId,
                    payload.stripeSubscriptionId,
                  ].filter(Boolean as any)
                )
              );
              update.stripeSubscriptionId = payload.stripeSubscriptionId;
              update.stripeSubscriptionHistory = newHistory;
            } else {
              console.warn("Stripe webhook: stripeSubscriptionId mismatch", {
                userId: ref.id,
                existing: existing.stripeSubscriptionId,
                incoming: payload.stripeSubscriptionId,
                correlationId,
              });
            }
          } else if (!existing.stripeSubscriptionId) {
            update.stripeSubscriptionId = payload.stripeSubscriptionId;
          }
        }
        tx.set(ref, update, { merge: true });
      });
    }

    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventType: event.type,
        correlationId,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session || !session.metadata) break;

        const planId = normaliseInternalPlan(session.metadata.planId as any) || undefined;
        const email = session.metadata.email || (session as any).customer_email || (session as any).customer_details?.email;
        const metaUserId = session.metadata.userId as string | undefined;

        if (!planId || (!email && !metaUserId)) {
          console.warn("Stripe webhook missing metadata in checkout session", {
            correlationId,
            durationMs: nowTimestamp() - startedAt,
            sessionId: session.id,
          });
          break;
        }

        if (!["premium", "premiumPlus"].includes(planId)) break;

        try {
          let userRef: FirebaseFirestore.DocumentReference | null = null;
          const customerId = typeof session.customer === "string" ? session.customer : undefined;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : undefined;
          
          if (customerId) {
            const snap = await db.collection(COLLECTIONS.USERS).where("stripeCustomerId", "==", customerId).limit(1).get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          if (!userRef && subscriptionId) {
            const snap = await db.collection(COLLECTIONS.USERS).where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          if (!userRef && metaUserId) {
            const ref = db.collection(COLLECTIONS.USERS).doc(metaUserId);
            const doc = await ref.get();
            if (doc.exists) userRef = ref;
          }
          if (!userRef && email) {
            const snap = await db.collection(COLLECTIONS.USERS).where("email", "==", email.toLowerCase()).limit(1).get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          
          if (userRef) {
            let expiresAt: number | null = null;
            let stripeSubscriptionId: string | undefined;
            if (session.subscription) {
              try {
                const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                expiresAt = sub.current_period_end * 1000;
                stripeSubscriptionId = sub.id;
              } catch (subErr) {
                console.warn("Failed to retrieve subscription for expiration", subErr);
              }
            }
            await safeMergeUserBilling(
              userRef,
              {
                subscriptionPlan: planId,
                subscriptionExpiresAt: expiresAt,
                stripeCustomerId: session.customer as string | undefined,
                stripeSubscriptionId,
              },
              {
                allowReplaceSubIdIfCustomerMatches: true,
                incomingCustomerId: typeof session.customer === "string" ? session.customer : undefined,
              }
            );
          }

          if (email && isValidEmail(email)) {
            try {
              let amountCents: number | undefined;
              let invoiceUrl: string | undefined;
              if (session.invoice && typeof session.invoice === "string") {
                const inv = await stripe.invoices.retrieve(session.invoice);
                amountCents = inv.amount_paid || undefined;
                invoiceUrl = inv.hosted_invoice_url || inv.invoice_pdf || undefined;
              }
              let expiresAt: number | null = null;
              if (typeof session.subscription === "string") {
                const s = await stripe.subscriptions.retrieve(session.subscription);
                expiresAt = s.current_period_end ? s.current_period_end * 1000 : null;
              }
              await Notifications.subscriptionReceipt(email, {
                fullName: session.customer_details?.name || email.split("@")[0],
                plan: planId,
                amountCents,
                currency: (session.currency || "usd").toString(),
                invoiceUrl,
                expiresAt,
              });
            } catch {}
          }
          await markProcessed(event.id, event.type);
        } catch {}
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub || !sub.metadata) break;
        const email = (sub.metadata.email || sub.metadata.user_id) as string | undefined;
        if (!email) break;

        try {
          const snap = await db.collection(COLLECTIONS.USERS).where("email", "==", email.toLowerCase()).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                subscriptionPlan: "free",
                subscriptionExpiresAt: null,
                subscriptionCancelAtPeriodEnd: false,
                updatedAt: nowTimestamp(),
              },
              { merge: true }
            );
          }
          const planName = inferPlanFromSubscription(sub) || "premium";
          await Notifications.subscriptionCancelled(email, {
            fullName: email.split("@")[0],
            plan: planName,
            effectiveDate: sub.cancel_at ? sub.cancel_at * 1000 : undefined,
          });
          await markProcessed(event.id, event.type);
        } catch {}
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub || !sub.id) break;
        const planId = inferPlanFromSubscription(sub) || undefined;
        const email = (sub.metadata?.email || sub.metadata?.userEmail) as string | undefined;
        
        try {
          if (email && planId) {
            const snap = await db.collection(COLLECTIONS.USERS).where("email", "==", email.toLowerCase()).limit(1).get();
            if (!snap.empty) {
              await safeMergeUserBilling(
                snap.docs[0].ref,
                {
                  subscriptionPlan: planId,
                  subscriptionExpiresAt: sub.current_period_end ? sub.current_period_end * 1000 : null,
                  stripeSubscriptionId: sub.id,
                  stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
                  subscriptionCancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
                },
                {
                  allowReplaceSubIdIfCustomerMatches: true,
                  incomingCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
                }
              );
            }
          }
          if (email && isValidEmail(email)) {
            const fullName = email.split("@")[0];
            if (sub.status === "past_due" || sub.status === "unpaid") {
              const updateUrl = process.env.STRIPE_BILLING_PORTAL || `${process.env.NEXT_PUBLIC_APP_URL || "https://www.aroosi.app"}/plans`;
              await Notifications.renewalFailure(email, { fullName, plan: planId || "premium", reason: sub.status, updateUrl });
            } else if (sub.status === "active") {
              await Notifications.renewalSuccess(email, { fullName, plan: planId || "premium", periodEnd: sub.current_period_end ? sub.current_period_end * 1000 : undefined });
            }
          }
          await markProcessed(event.id, event.type);
        } catch {}
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : undefined;
        if (!subscriptionId) break;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const email = (sub.metadata?.email || invoice.customer_email || (invoice as any).customer_details?.email) as string | undefined;
          const planId = inferPlanFromSubscription(sub) || undefined;
          if (email && planId) {
            const snap = await db.collection(COLLECTIONS.USERS).where("email", "==", email.toLowerCase()).limit(1).get();
            if (!snap.empty) {
              await safeMergeUserBilling(snap.docs[0].ref, {
                subscriptionPlan: planId,
                subscriptionExpiresAt: sub.current_period_end ? sub.current_period_end * 1000 : null,
                stripeSubscriptionId: sub.id,
                stripeCustomerId: typeof sub.customer === "string" ? sub.customer : undefined,
              });
            }
            const amountCents = invoice.amount_paid || invoice.amount_due || 0;
            const invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || undefined;
            await Notifications.subscriptionReceipt(email, { fullName: email.split("@")[0], plan: planId, amountCents, currency: (invoice.currency || "usd").toString(), invoiceUrl, expiresAt: sub.current_period_end ? sub.current_period_end * 1000 : null });
            await Notifications.renewalSuccess(email, { fullName: email.split("@")[0], plan: planId, periodEnd: sub.current_period_end ? sub.current_period_end * 1000 : undefined, invoiceUrl });
          }
          await markProcessed(event.id, event.type);
        } catch {}
        break;
      }
    }

    return NextResponse.json({ received: true, correlationId, durationMs: nowTimestamp() - startedAt });
  } catch (err) {
    console.error("Stripe webhook error", { correlationId, message: err instanceof Error ? err.message : String(err), durationMs: nowTimestamp() - startedAt });
    return NextResponse.json({ error: "Webhook handler failed", correlationId }, { status: 500 });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
