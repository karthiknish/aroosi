import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convexClient";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { type, data } = payload;

    switch (type) {
      case "user.created":
        // Create user in Convex when Clerk user is created
        await convex.mutation(api.users.createUserAndProfile, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address || "",
          profileData: {
            fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          },
        });
        break;
        
      case "user.updated":
        // Update user in Convex when Clerk user is updated
        // You can implement this based on your needs
        break;
        
      case "user.deleted":
        // Handle user deletion if needed
        // You can implement this based on your needs
        break;
        
      default:
        console.log(`Unhandled Clerk event type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}