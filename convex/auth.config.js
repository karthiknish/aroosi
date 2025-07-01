export default {
  jwt: {
    issuer: process.env.CLERK_JWT_ISSUER_DOMAIN,
    applicationID: "proper-gull-501",
  },
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "proper-gull-501",
    },
  ],
};
