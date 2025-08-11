export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
      // Use Clerk's JWT template
      apiKey: process.env.CONVEX_CLERK_API_KEY,
    },
  ],
};
