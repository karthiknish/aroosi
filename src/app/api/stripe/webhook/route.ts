import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
// Convex dependencies removed after Firestore migration
import { Notifications } from "@/lib/notify";
import { logSecurityEvent } from "@/lib/utils/securityHeaders";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import Stripe from "stripe";
import {
  inferPlanFromSubscription,
  normaliseInternalPlan,
  getStripePlanMapping,
} from "@/lib/subscription/stripePlanMapping";

// Disable automatic body parsing in Next.js (app router) by reading raw body via req.text()
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
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
        durationMs: Date.now() - startedAt,
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
        durationMs: Date.now() - startedAt,
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
        durationMs: Date.now() - startedAt,
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
        durationMs: Date.now() - startedAt,
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

    console.info("Stripe webhook received", {
      scope: "stripe.webhook",
      type: "received",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      eventType: event.type,
      eventId: event.id,
    });

    // Enforce allowlist
    if (!ALLOWED_EVENT_TYPES.has(event.type)) {
      console.info("Stripe webhook event type not in allowlist (ignored)", {
        scope: "stripe.webhook",
        type: "ignored_event",
        correlationId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        eventType: event.type,
      });
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
        durationMs: Date.now() - startedAt,
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
        if (snap.exists) return; // already processed
        // Retention: add ttlAt so Firestore TTL (configured in console) can purge old processed events automatically.
        const retentionDays = parseInt(
          process.env.STRIPE_EVENT_TTL_DAYS || "30",
          10
        );
        const now = new Date();
        const ttlAt = new Date(
          now.getTime() + retentionDays * 24 * 60 * 60 * 1000
        );
        await ref.create({
          type,
          processedAt: Date.now(), // preserve existing numeric field for backward compatibility
          createdAt: now,
          ttlAt, // Firestore TTL field (timestamp)
          retentionDays,
        }); // create will fail if exists
      } catch (e) {
        // If create failed because exists, ignore; else warn
        if (!(e instanceof Error && /already exists/i.test(e.message))) {
          console.warn("Failed to mark stripe event processed", id, e);
        }
      }
    }

    // Helper to safely merge billing fields without overwriting mismatched stripe IDs (data integrity guard)
    async function safeMergeUserBilling(
      ref: FirebaseFirestore.DocumentReference,
      payload: {
        subscriptionPlan?: any;
        subscriptionExpiresAt?: number | null;
        stripeCustomerId?: string | undefined;
        stripeSubscriptionId?: string | undefined;
      }
    ) {
      await db.runTransaction(async (tx: any) => {
        const doc = await tx.get(ref);
        if (!doc.exists) return; // Nothing to merge
        const existing = doc.data() as any;
        const update: any = { updatedAt: Date.now() };
        if (payload.subscriptionPlan !== undefined) {
          update.subscriptionPlan = payload.subscriptionPlan;
        }
        if (payload.subscriptionExpiresAt !== undefined) {
          update.subscriptionExpiresAt = payload.subscriptionExpiresAt;
        }
        // Only set stripeCustomerId if not set already OR identical; log mismatch otherwise
        if (payload.stripeCustomerId) {
          if (
            existing.stripeCustomerId &&
            existing.stripeCustomerId !== payload.stripeCustomerId
          ) {
            console.warn("Stripe webhook: stripeCustomerId mismatch", {
              scope: "stripe.webhook",
              type: "id_mismatch",
              userId: ref.id,
              existing: existing.stripeCustomerId,
              incoming: payload.stripeCustomerId,
              correlationId,
            });
            logSecurityEvent(
              "VALIDATION_FAILED",
              {
                reason: "stripeCustomerId mismatch",
                userId: ref.id,
                existing: existing.stripeCustomerId,
                incoming: payload.stripeCustomerId,
                correlationId,
              },
              req
            );
          } else if (!existing.stripeCustomerId) {
            update.stripeCustomerId = payload.stripeCustomerId;
          }
        }
        if (payload.stripeSubscriptionId) {
          if (
            existing.stripeSubscriptionId &&
            existing.stripeSubscriptionId !== payload.stripeSubscriptionId
          ) {
            console.warn("Stripe webhook: stripeSubscriptionId mismatch", {
              scope: "stripe.webhook",
              type: "id_mismatch",
              userId: ref.id,
              existing: existing.stripeSubscriptionId,
              incoming: payload.stripeSubscriptionId,
              correlationId,
            });
            logSecurityEvent(
              "VALIDATION_FAILED",
              {
                reason: "stripeSubscriptionId mismatch",
                userId: ref.id,
                existing: existing.stripeSubscriptionId,
                incoming: payload.stripeSubscriptionId,
                correlationId,
              },
              req
            );
          } else if (!existing.stripeSubscriptionId) {
            update.stripeSubscriptionId = payload.stripeSubscriptionId;
          }
        }
        tx.set(ref, update, { merge: true });
      });
    }

    if (await alreadyProcessed(event.id)) {
      console.info("Stripe webhook duplicate ignored", {
        eventId: event.id,
        eventType: event.type,
        correlationId,
      });
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

        if (!session || !session.metadata) {
          console.error("Stripe webhook invalid checkout session object", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
          });
          break;
        }

        const planId =
          normaliseInternalPlan(session.metadata.planId as any) || undefined;
        // Prefer explicit metadata email; fallback to session.customer_email then customer_details.email
        const email =
          session.metadata.email ||
          (session as any).customer_email ||
          (session as any).customer_details?.email;
        const metaUserId = (session.metadata.userId ||
          (session.metadata as any).user_id) as string | undefined;

        if (!planId || (!email && !metaUserId)) {
          console.warn("Stripe webhook missing metadata in checkout session", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
            sessionId: session.id,
            hasEmail: !!email,
            hasUserId: !!metaUserId,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Missing metadata",
              sessionId: session.id,
              planId,
              email: !!email,
              correlationId,
            },
            req
          );
          break;
        }

        if (!["premium", "premiumPlus"].includes(planId)) {
          console.warn("Stripe webhook invalid plan ID", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
            planId,
            sessionId: session.id,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Invalid plan ID",
              planId,
              sessionId: session.id,
              correlationId,
            },
            req
          );
          break;
        }

        try {
          // Update user doc in Firestore by email
          let userRef: FirebaseFirestore.DocumentReference | null = null;
          // Stronger binding: prefer customer/subscription IDs to locate user
          const customerId =
            typeof session.customer === "string" ? session.customer : undefined;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : undefined;
          if (customerId) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("stripeCustomerId", "==", customerId)
              .limit(1)
              .get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          if (!userRef && subscriptionId) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("stripeSubscriptionId", "==", subscriptionId)
              .limit(1)
              .get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          if (!userRef && metaUserId) {
            const ref = db.collection(COLLECTIONS.USERS).doc(metaUserId);
            const doc = await ref.get();
            if (doc.exists) userRef = ref;
          }
          if (!userRef && email) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("email", "==", email.toLowerCase())
              .limit(1)
              .get();
            if (!snap.empty) userRef = snap.docs[0].ref;
          }
          if (userRef) {
            // Derive expiration from subscription if present
            let expiresAt: number | null = null;
            let stripeSubscriptionId: string | undefined;
            if (session.subscription) {
              try {
                const sub = await stripe.subscriptions.retrieve(
                  session.subscription as string
                );
                expiresAt = sub.current_period_end * 1000;
                stripeSubscriptionId = sub.id;
              } catch (subErr) {
                console.warn(
                  "Failed to retrieve subscription for expiration",
                  subErr
                );
              }
            }
            await safeMergeUserBilling(userRef, {
              subscriptionPlan: planId,
              subscriptionExpiresAt: expiresAt,
              stripeCustomerId: session.customer as string | undefined,
              stripeSubscriptionId,
            });
          } else {
            console.warn(
              "Stripe webhook: user not found for checkout completion",
              {
                email,
                userId: metaUserId,
                correlationId,
              }
            );
          }

          console.info("Stripe webhook subscription updated", {
            scope: "stripe.webhook",
            type: "success",
            correlationId,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
            planId,
          });

          if (session.customer_email && isValidEmail(session.customer_email)) {
            try {
              await Notifications.subscriptionChanged(
                session.customer_email,
                session.customer_email.split("@")[0] || session.customer_email,
                planId
              );
              console.info("Stripe webhook notification sent", {
                scope: "stripe.webhook",
                type: "notify_success",
                correlationId,
                statusCode: 200,
                durationMs: Date.now() - startedAt,
              });
            } catch (emailError) {
              console.error("Stripe webhook notify error", {
                scope: "stripe.webhook",
                type: "notify_error",
                message:
                  emailError instanceof Error
                    ? emailError.message
                    : String(emailError),
                correlationId,
                statusCode: 500,
                durationMs: Date.now() - startedAt,
              });
            }
          }
          await markProcessed(event.id, event.type);
        } catch (e) {
          console.error("Stripe webhook Firestore subscription update failed", {
            scope: "stripe.webhook",
            type: "firestore_update_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        if (!sub || !sub.metadata) {
          console.warn("Stripe webhook invalid subscription object", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
          });
          break;
        }

        const email = (sub.metadata.email || sub.metadata.user_id) as
          | string
          | undefined;

        if (!email) {
          console.warn(
            "Stripe webhook missing email in subscription deletion",
            {
              scope: "stripe.webhook",
              type: "validation_error",
              correlationId,
              statusCode: 400,
              durationMs: Date.now() - startedAt,
              subscriptionId: sub.id,
            }
          );
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Missing email in subscription deletion",
              subscriptionId: sub.id,
              correlationId,
            },
            req
          );
          break;
        }

        try {
          const snap = await db
            .collection(COLLECTIONS.USERS)
            .where("email", "==", email.toLowerCase())
            .limit(1)
            .get();
          if (!snap.empty) {
            await snap.docs[0].ref.set(
              {
                subscriptionPlan: "free",
                subscriptionExpiresAt: null,
                updatedAt: Date.now(),
              },
              { merge: true }
            );
          }

          console.info("Stripe webhook subscription downgraded", {
            scope: "stripe.webhook",
            type: "success",
            correlationId,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
          });
          await markProcessed(event.id, event.type);
        } catch (e) {
          console.error("Stripe webhook Firestore downgrade failed", {
            scope: "stripe.webhook",
            type: "firestore_update_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub || !sub.id) {
          console.warn("Stripe webhook invalid subscription.updated object", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
          });
          break;
        }
        const planId = inferPlanFromSubscription(sub) || undefined;
        // Enforce allowlist of internal plan IDs (defense in depth)
        const allowedPlans = new Set(["premium", "premiumPlus", "free"]);
        if (planId && !allowedPlans.has(planId)) {
          console.warn("Stripe subscription.updated rejected unknown plan", {
            planId,
            subscriptionId: sub.id,
            correlationId,
          });
          break;
        }
        const email = (sub.metadata?.email || sub.metadata?.userEmail) as
          | string
          | undefined;
        if (!email) {
          console.warn("Stripe subscription.updated missing email metadata", {
            subscriptionId: sub.id,
            correlationId,
          });
        }
        try {
          if (email && planId) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("email", "==", email.toLowerCase())
              .limit(1)
              .get();
            if (!snap.empty) {
              await safeMergeUserBilling(snap.docs[0].ref, {
                subscriptionPlan: planId,
                subscriptionExpiresAt: sub.current_period_end
                  ? sub.current_period_end * 1000
                  : null,
                stripeSubscriptionId: sub.id,
                stripeCustomerId:
                  typeof sub.customer === "string" ? sub.customer : undefined,
              });
              console.info("Stripe subscription.updated synced", {
                correlationId,
                subscriptionId: sub.id,
                planId,
              });
            }
          }
          await markProcessed(event.id, event.type);
        } catch (e) {
          console.error("Stripe subscription.updated Firestore sync failed", {
            correlationId,
            subscriptionId: sub.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        break;
      }
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        if (!sub || !sub.id) {
          console.warn("Stripe webhook invalid subscription.created object", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
          });
          break;
        }
        try {
          // Derive planId similar to subscription.updated handler
          const planId = inferPlanFromSubscription(sub) || undefined;
          const email = (sub.metadata?.email || sub.metadata?.userEmail) as
            | string
            | undefined;
          if (!email) {
            console.warn("Stripe subscription.created missing email metadata", {
              subscriptionId: sub.id,
              correlationId,
            });
          }
          if (email && planId) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("email", "==", email.toLowerCase())
              .limit(1)
              .get();
            if (!snap.empty) {
              await safeMergeUserBilling(snap.docs[0].ref, {
                subscriptionPlan: planId,
                subscriptionExpiresAt: sub.current_period_end
                  ? sub.current_period_end * 1000
                  : null,
                stripeSubscriptionId: sub.id,
                stripeCustomerId:
                  typeof sub.customer === "string" ? sub.customer : undefined,
              });
              console.info("Stripe subscription.created synced", {
                correlationId,
                subscriptionId: sub.id,
                planId,
              });
            }
          }
          await markProcessed(event.id, event.type);
        } catch (e) {
          console.error("Stripe subscription.created Firestore sync failed", {
            correlationId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice || !invoice.id) {
          console.warn("Stripe webhook invalid invoice.paid object", {
            correlationId,
          });
          break;
        }
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : undefined;
        if (!subscriptionId) break;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const invoiceAny: any = invoice; // widen for optional customer_details in some API versions
          const email = (sub.metadata?.email ||
            invoice.customer_email ||
            invoiceAny.customer_details?.email) as string | undefined;
          const planId: "premium" | "premiumPlus" | undefined =
            inferPlanFromSubscription(sub) || undefined;
          if (planId && !["premium", "premiumPlus"].includes(planId)) {
            console.warn("Stripe invoice.paid rejected unknown plan", {
              planId,
              subscriptionId: sub.id,
              correlationId,
            });
            break;
          }
          if (email && planId) {
            const snap = await db
              .collection(COLLECTIONS.USERS)
              .where("email", "==", email.toLowerCase())
              .limit(1)
              .get();
            if (!snap.empty) {
              await safeMergeUserBilling(snap.docs[0].ref, {
                subscriptionPlan: planId,
                subscriptionExpiresAt: sub.current_period_end
                  ? sub.current_period_end * 1000
                  : null,
                stripeSubscriptionId: sub.id,
                stripeCustomerId:
                  typeof sub.customer === "string" ? sub.customer : undefined,
              });
              console.info("Stripe invoice.paid subscription synced", {
                correlationId,
                subscriptionId: sub.id,
                planId,
              });
            }
          }
          await markProcessed(event.id, event.type);
        } catch (e) {
          console.error("Stripe invoice.paid sync failed", {
            correlationId,
            subscriptionId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        break;
      }

      default:
        console.info("Stripe webhook unhandled event type", {
          scope: "stripe.webhook",
          type: "unhandled_event",
          correlationId,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          eventType: event.type,
        });
        break;
    }

    console.info("Stripe webhook processed successfully", {
      scope: "stripe.webhook",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      eventType: event.type,
    });
    return NextResponse.json({
      received: true,
      eventType: event.type,
      correlationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook processing error", {
      scope: "stripe.webhook",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });

    logSecurityEvent(
      "VALIDATION_FAILED",
      { reason: "Processing error", error: message, correlationId },
      req
    );

    return NextResponse.json(
      { error: "Webhook processing failed", correlationId },
      { status: 500 }
    );
  }
}

// Helper function for email validation (reused from checkout)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}
