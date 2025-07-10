// Auth config for native authentication
// Clerk configuration removed - using native JWT authentication
export default {
  jwt: {
    issuer: "aroosi-native-auth",
    applicationID: "proper-gull-501",
  },
  providers: [
    {
      domain: "aroosi.app",
      applicationID: "proper-gull-501",
    },
  ],
};
