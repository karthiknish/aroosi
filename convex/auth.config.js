export default {
  jwt: {
    issuer: process.env.CLERK_JWT_ISSUER_DOMAIN,
    applicationID: "quirky-akita-969",
  },
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "quirky-akita-969",
    },
  ],
};
