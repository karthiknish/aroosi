import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Notifications } from "@/lib/notify";
import Stripe from "stripe";

// Disable automatic body parsing in Next.js (app router) by reading raw body via req.text()
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await req.text();
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed.", err);
    return new Response("Webhook Error", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = session.metadata?.planId as
        | "premium"
        | "premiumPlus"
        | undefined;
      const clerkId = session.metadata?.clerkId;
      if (!planId || !clerkId) break;

      // Update Convex profile subscription plan via internal action
      try {
        const convex = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        await convex.action(api.users.stripeUpdateSubscription, {
          clerkId,
          plan: planId,
        });

        // Send email notification
        if (session.customer_email) {
          await Notifications.subscriptionChanged(
            session.customer_email,
            session.customer_email.split("@")[0] || session.customer_email,
            planId
          );
        }
      } catch (e) {
        console.error("Convex subscription update failed", e);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const clerkId = (sub.metadata?.clerkId || sub.metadata?.clerk_id) as
        | string
        | undefined;
      if (!clerkId) break;
      try {
        const convex = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        await convex.action(api.users.stripeUpdateSubscription, {
          clerkId,
          plan: "free",
        });
      } catch (e) {
        console.error("Convex subscription downgrade failed", e);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
