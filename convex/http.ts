"use strict";

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Clerk webhook endpoint
// See https://docs.convex.dev/functions/http-actions/webhooks#clerk
// and https://clerk.com/docs/integrations/webhooks
http.route({
  path: "/api/http/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await request.json(); // Clerk sends JSON

    // Ensure the webhook is from Clerk (optional but recommended for production)
    // You might need to install `svix` and configure webhook secret in Clerk & Convex
    // const svix_id = request.headers.get("svix-id");
    // const svix_timestamp = request.headers.get("svix-timestamp");
    // const svix_signature = request.headers.get("svix-signature");
    // if (!svix_id || !svix_timestamp || !svix_signature) {
    //   return new Response("Error occurred -- no svix headers", { status: 400 });
    // }
    // const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    // try {
    //   payload = wh.verify(await request.text(), {
    //     "svix-id": svix_id,
    //     "svix-timestamp": svix_timestamp,
    //     "svix-signature": svix_signature,
    //   }) as WebhookEvent;
    // } catch (err: any) {
    //   console.error("Error verifying Clerk webhook:", err.message);
    //   return new Response("Error occurred -- Invalid signature", { status: 400 });
    // }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        const {
          id: clerkId,
          email_addresses,
          first_name,
          last_name,
        } = event.data;
        const email = (
          email_addresses as Array<{
            id: string;
            email_address: string;
          }>
        )?.find(
          (addr) => addr.id === event.data.primary_email_address_id,
        )?.email_address;

        if (!clerkId || !email) {
          console.error(
            "Clerk webhook error: missing clerkId or primary email",
            event.data,
          );
          return new Response("Error: Missing clerkId or primary email", {
            status: 400,
          });
        }

        await ctx.runMutation(internal.users.internalUpsertUser, {
          email: email as string,
          hashedPassword: "", // Clerk users don't have passwords in our system
          fullName: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
        });
        break;
      // case "user.deleted": // Optional: handle user deletion
      //   const { id: clerkIdToDelete } = event.data;
      //   if (clerkIdToDelete) {
      //     await ctx.runMutation(internal.users.internalDeleteUserByClerkId, { // You'd need to create this mutation
      //       clerkId: clerkIdToDelete as string,
      //     });
      //   }
      //   break;
      default:
        console.log("Received unhandled Clerk webhook event type:", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
