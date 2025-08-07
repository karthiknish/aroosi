import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { api } from "@convex/_generated/api";
import { Notifications } from "@/lib/notify";
import { logSecurityEvent } from "@/lib/utils/securityHeaders";
import { convexMutationWithAuth } from "@/lib/convexServer";
import Stripe from "stripe";

// Disable automatic body parsing in Next.js (app router) by reading raw body via req.text()
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      logSecurityEvent("VALIDATION_FAILED", { reason: "Missing signature", correlationId }, req);
      console.warn("Stripe webhook missing signature", {
        scope: "stripe.webhook",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Missing signature", correlationId }, { status: 400 });
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
      logSecurityEvent("VALIDATION_FAILED", { reason: "Empty body", correlationId }, req);
      console.warn("Stripe webhook empty body", {
        scope: "stripe.webhook",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Empty request body", correlationId }, { status: 400 });
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
        { reason: "Signature verification failed", error: message, correlationId },
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

    if (!event.type || !event.data || !event.data.object) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        { reason: "Invalid event structure", eventType: event.type, correlationId },
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
      return NextResponse.json({ error: "Invalid webhook event", correlationId }, { status: 400 });
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

        const planId = session.metadata.planId as "premium" | "premiumPlus" | undefined;
        const email = session.metadata.email;

        if (!planId || !email) {
          console.warn("Stripe webhook missing metadata in checkout session", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
            sessionId: session.id,
            hasEmail: !!email,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            { reason: "Missing metadata", sessionId: session.id, planId, email: !!email, correlationId },
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
            { reason: "Invalid plan ID", planId, sessionId: session.id, correlationId },
            req
          );
          break;
        }

        try {
          if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
            throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
          }

          await convexMutationWithAuth(req, (api as any).users?.stripeUpdateSubscription ?? (api as any).users?.updateProfile, { 
            updates: { subscriptionPlan: planId, updatedAt: Date.now() },
            email,
          } as any).catch((e: unknown) => {
              console.error("Stripe webhook convex action error", {
                scope: "stripe.webhook",
                type: "convex_action_error",
                message: e instanceof Error ? e.message : String(e),
                correlationId,
                statusCode: 500,
                durationMs: Date.now() - startedAt,
              });
              throw e;
            });

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
                message: emailError instanceof Error ? emailError.message : String(emailError),
                correlationId,
                statusCode: 500,
                durationMs: Date.now() - startedAt,
              });
            }
          }
        } catch (e) {
          console.error("Stripe webhook convex subscription update failed", {
            scope: "stripe.webhook",
            type: "convex_action_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Convex update failed",
              planId,
              error: e instanceof Error ? e.message : "Unknown error",
              correlationId,
            },
            req
          );
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

        const email = (sub.metadata.email || sub.metadata.user_id) as string | undefined;

        if (!email) {
          console.warn("Stripe webhook missing email in subscription deletion", {
            scope: "stripe.webhook",
            type: "validation_error",
            correlationId,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
            subscriptionId: sub.id,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            { reason: "Missing email in subscription deletion", subscriptionId: sub.id, correlationId },
            req
          );
          break;
        }

        try {
          if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
            throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
          }

          await convexMutationWithAuth(req, (api as any).users?.stripeUpdateSubscription ?? (api as any).users?.updateProfile, { 
            updates: { subscriptionPlan: "free", updatedAt: Date.now() },
            email,
          } as any).catch((e: unknown) => {
              console.error("Stripe webhook convex action downgrade error", {
                scope: "stripe.webhook",
                type: "convex_action_error",
                message: e instanceof Error ? e.message : String(e),
                correlationId,
                statusCode: 500,
                durationMs: Date.now() - startedAt,
              });
              throw e;
            });

          console.info("Stripe webhook subscription downgraded", {
            scope: "stripe.webhook",
            type: "success",
            correlationId,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
          });
        } catch (e) {
          console.error("Stripe webhook subscription downgrade failed", {
            scope: "stripe.webhook",
            type: "convex_action_error",
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Convex downgrade failed",
              error: e instanceof Error ? e.message : "Unknown error",
              correlationId,
            },
            req
          );
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
    return NextResponse.json({ received: true, eventType: event.type, correlationId });
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

    return NextResponse.json({ error: "Webhook processing failed", correlationId }, { status: 500 });
  }
}

// Helper function for email validation (reused from checkout)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}
