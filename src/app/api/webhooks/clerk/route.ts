import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth } from "@/lib/convexServer";

function log(
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
) {
  const payload = {
    scope: "api/webhooks/clerk",
    level,
    message,
    ts: new Date().toISOString(),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(payload);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(payload);
  } else {
    // eslint-disable-next-line no-console
    console.log(payload);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch((e) => {
      log("error", "Invalid JSON payload", {
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    });
    const { type, data } = payload || {};
    if (!type) {
      log("warn", "Received webhook without type", {});
    }

    switch (type) {
      case "user.created":
        try {
          // Create user in Convex when Clerk user is created
          await convexMutationWithAuth(
            request,
            api.users.createUserAndProfile,
            {
              clerkId: data.id,
              email: data.email_addresses[0]?.email_address || "",
              profileData: {
                fullName:
                  `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                email: data.email_addresses[0]?.email_address || undefined,
                isProfileComplete: false,
              },
            }
          );
        } catch (e) {
          log("error", "Convex createUserAndProfile failed for user.created", {
            error: e instanceof Error ? e.message : String(e),
            clerkId: data?.id,
          });
          return NextResponse.json(
            { error: "Convex mutation failed" },
            { status: 500 }
          );
        }
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
      // Unhandled Clerk event type; ignore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log("error", "Unhandled webhook error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}