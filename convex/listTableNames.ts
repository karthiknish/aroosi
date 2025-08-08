import { query } from "./_generated/server";
import { TableNamesInDataModel } from "convex/server";

export const listTableNames = query({
  args: {},
  handler: async (ctx) => {
    // Return a list of known table names
    return [
      "users", "profiles", "authAccounts", "authSessions", "authVerificationCodes"
    ];
  },
});