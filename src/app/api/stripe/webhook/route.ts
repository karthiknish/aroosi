import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Notifications } from "@/lib/notify";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { logSecurityEvent } from "@/lib/utils/securityHeaders";
import Stripe from "stripe";

// Disable automatic body parsing in Next.js (app router) by reading raw body via req.text()
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Validate webhook signature
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        { reason: "Missing signature" },
        req,
      );
      return errorResponse("Missing signature", 400);
    }

    // Validate webhook secret configuration
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return errorResponse("Webhook configuration error", 500);
    }

    let event: Stripe.Event;
    const rawBody = await req.text();

    // Validate request body
    if (!rawBody || rawBody.length === 0) {
      logSecurityEvent("VALIDATION_FAILED", { reason: "Empty body" }, req);
      return errorResponse("Empty request body", 400);
    }

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);

      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          reason: "Signature verification failed",
          error: err instanceof Error ? err.message : "Unknown error",
        },
        req,
      );

      return errorResponse("Webhook signature verification failed", 400);
    }

    // Log webhook received for monitoring
    console.log(`Stripe webhook received: ${event.type}, ID: ${event.id}`);

    // Validate event structure
    if (!event.type || !event.data || !event.data.object) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        {
          reason: "Invalid event structure",
          eventType: event.type,
        },
        req,
      );
      return errorResponse("Invalid webhook event", 400);
    }

    // Process webhook events securely
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Validate session object
        if (!session || !session.metadata) {
          console.error("Invalid checkout session object:", session);
          break;
        }

        const planId = session.metadata.planId as
          | "premium"
          | "premiumPlus"
          | undefined;
        const email = session.metadata.email;

        // Validate required metadata
        if (!planId || !email) {
          console.error("Missing required metadata in checkout session:", {
            planId,
            email,
            sessionId: session.id,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Missing metadata",
              sessionId: session.id,
              planId,
              email: !!email,
            },
            req,
          );
          break;
        }

        // Validate plan ID
        if (!["premium", "premiumPlus"].includes(planId)) {
          console.error("Invalid plan ID in webhook:", planId);
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Invalid plan ID",
              planId,
              sessionId: session.id,
            },
            req,
          );
          break;
        }

        // Log subscription upgrade for monitoring
        // logSecurityEvent('PAYMENT_ACTION', {
        //   action: 'subscription_upgrade',
        //   planId,
        //   email,
        //   userId,
        //   sessionId: session.id
        // }, req);

        console.log(`Processing subscription upgrade: ${email} -> ${planId}`);

        // Update Convex profile subscription plan via internal action
        try {
          if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
            throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
          }

          const convex = getConvexClient();
          if (!convex)
            return errorResponse("Convex client not configured", 500);

          await convex.action(api.users.stripeUpdateSubscription, {
            email,
            plan: planId,
          });

          console.log(
            `Subscription updated successfully: ${email} -> ${planId}`,
          );

          // Send email notification with validation
          if (session.customer_email && isValidEmail(session.customer_email)) {
            try {
              await Notifications.subscriptionChanged(
                session.customer_email,
                session.customer_email.split("@")[0] || session.customer_email,
                planId,
              );
              console.log(
                `Subscription notification sent to: ${session.customer_email}`,
              );
            } catch (emailError) {
              console.error(
                "Failed to send subscription notification:",
                emailError,
              );
            }
          }
        } catch (e) {
          console.error("Convex subscription update failed:", e);

          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Convex update failed",
              email,
              planId,
              error: e instanceof Error ? e.message : "Unknown error",
            },
            req,
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // Validate subscription object
        if (!sub || !sub.metadata) {
          console.error("Invalid subscription object:", sub);
          break;
        }

        const email = (sub.metadata.email || sub.metadata.clerk_id) as
          | string
          | undefined;

        if (!email) {
          console.error("Missing email in subscription deletion:", {
            subscriptionId: sub.id,
          });
          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Missing email in subscription deletion",
              subscriptionId: sub.id,
            },
            req,
          );
          break;
        }

        // Log subscription cancellation for monitoring
        // logSecurityEvent('PAYMENT_ACTION', {
        //   action: 'subscription_cancelled',
        //   email,
        //   subscriptionId: sub.id
        // }, req);

        console.log(`Processing subscription cancellation: ${email}`);

        try {
          if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
            throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
          }

          const convex = getConvexClient();
          if (!convex)
            return errorResponse("Convex client not configured", 500);

          await convex.action(api.users.stripeUpdateSubscription, {
            email,
            plan: "free",
          });

          console.log(`Subscription downgraded successfully: ${email} -> free`);
        } catch (e) {
          console.error("Convex subscription downgrade failed:", e);

          logSecurityEvent(
            "VALIDATION_FAILED",
            {
              reason: "Convex downgrade failed",
              email,
              error: e instanceof Error ? e.message : "Unknown error",
            },
            req,
          );
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    console.log(`Stripe webhook processed successfully: ${event.type}`);
    return successResponse({ received: true, eventType: event.type });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);

    logSecurityEvent(
      "VALIDATION_FAILED",
      {
        reason: "Processing error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      req,
    );

    return errorResponse("Webhook processing failed", 500);
  }
}

// Helper function for email validation (reused from checkout)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}
