import { Stripe } from "stripe";

let stripeInstance: Stripe | null = null;

// Export a singleton Stripe instance to avoid unnecessary re-initialisation in dev hot reloads.
export const stripe = (() => {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  
  // Return a proxy that throws on usage if not configured
  return new Proxy({} as Stripe, {
    get(target, prop) {
      if (!stripeInstance) {
        throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.");
      }
      return (stripeInstance as any)[prop];
    }
  });
})();
