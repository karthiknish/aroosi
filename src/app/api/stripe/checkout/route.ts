import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireUserToken } from "@/app/api/_utils/auth";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";

interface RequestBody {
  planId: "premium" | "premiumPlus";
}

interface UserRecord {
  clerkId: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const auth = requireUserToken(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const token = auth.token;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { planId } = body;
  if (!planId || !["premium", "premiumPlus"].includes(planId)) {
    return NextResponse.json(
      { success: false, error: "Invalid planId" },
      { status: 400 }
    );
  }

  const priceId =
    planId === "premium"
      ? process.env.NEXT_PUBLIC_PREMIUM_PRICE_ID ||
        process.env.STRIPE_PRICE_ID_PREMIUM
      : process.env.NEXT_PUBLIC_PREMIUM_PLUS_PRICE_ID ||
        process.env.STRIPE_PRICE_ID_PREMIUM_PLUS;

  if (!priceId) {
    console.error("Missing Stripe price ID env var for plan", planId);
    return NextResponse.json(
      { success: false, error: "Server config error" },
      { status: 500 }
    );
  }

  // Fetch user details from Convex to pre-fill email and pass clerkId as metadata.
  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json(
      { success: false, error: "Convex not configured" },
      { status: 500 }
    );
  }
  convex.setAuth(token);

  const userRecord = (await convex.query(
    api.users.getCurrentUserWithProfile,
    {}
  )) as unknown as UserRecord;
  if (!userRecord) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    req.headers.get("origin") ||
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userRecord.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      planId,
      clerkId: userRecord.clerkId,
    },
    success_url: `${baseUrl}/plans?checkout=success`,
    cancel_url: `${baseUrl}/plans?checkout=cancel`,
  });

  return NextResponse.json({ success: true, url: session.url });
}
