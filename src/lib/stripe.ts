import { Stripe } from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY env variable is missing");
}

// Export a singleton Stripe instance to avoid unnecessary re-initialisation in dev hot reloads.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});
