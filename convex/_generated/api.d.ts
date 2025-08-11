/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as _root from "../_root.js";
import type * as auth from "../auth.js";
import type * as blog from "../blog.js";
import type * as compatibility from "../compatibility.js";
import type * as contact from "../contact.js";
import type * as createAuthAccount from "../createAuthAccount.js";
import type * as createUserWithClerk from "../createUserWithClerk.js";
import type * as deliveryReceipts from "../deliveryReceipts.js";
import type * as engagement from "../engagement.js";
import type * as getAuthAccountByEmail from "../getAuthAccountByEmail.js";
import type * as getCurrentUserWithProfile from "../getCurrentUserWithProfile.js";
import type * as getProfileByUserId from "../getProfileByUserId.js";
import type * as http from "../http.js";
import type * as icebreakers from "../icebreakers.js";
import type * as images from "../images.js";
import type * as interests from "../interests.js";
import type * as listTableNames from "../listTableNames.js";
import type * as messages from "../messages.js";
import type * as migration from "../migration.js";
import type * as presence from "../presence.js";
import type * as profiles from "../profiles.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as quickPicks from "../quickPicks.js";
import type * as recommendations from "../recommendations.js";
import type * as safety from "../safety.js";
import type * as storage from "../storage.js";
import type * as subscriptions from "../subscriptions.js";
import type * as testAuth from "../testAuth.js";
import type * as typingIndicators from "../typingIndicators.js";
import type * as usageTracking from "../usageTracking.js";
import type * as users from "../users.js";
import type * as utils_rateLimit from "../utils/rateLimit.js";
import type * as utils_requireAdmin from "../utils/requireAdmin.js";
import type * as utils_sanitize from "../utils/sanitize.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  _root: typeof _root;
  auth: typeof auth;
  blog: typeof blog;
  compatibility: typeof compatibility;
  contact: typeof contact;
  createAuthAccount: typeof createAuthAccount;
  createUserWithClerk: typeof createUserWithClerk;
  deliveryReceipts: typeof deliveryReceipts;
  engagement: typeof engagement;
  getAuthAccountByEmail: typeof getAuthAccountByEmail;
  getCurrentUserWithProfile: typeof getCurrentUserWithProfile;
  getProfileByUserId: typeof getProfileByUserId;
  http: typeof http;
  icebreakers: typeof icebreakers;
  images: typeof images;
  interests: typeof interests;
  listTableNames: typeof listTableNames;
  messages: typeof messages;
  migration: typeof migration;
  presence: typeof presence;
  profiles: typeof profiles;
  pushNotifications: typeof pushNotifications;
  quickPicks: typeof quickPicks;
  recommendations: typeof recommendations;
  safety: typeof safety;
  storage: typeof storage;
  subscriptions: typeof subscriptions;
  testAuth: typeof testAuth;
  typingIndicators: typeof typingIndicators;
  usageTracking: typeof usageTracking;
  users: typeof users;
  "utils/rateLimit": typeof utils_rateLimit;
  "utils/requireAdmin": typeof utils_requireAdmin;
  "utils/sanitize": typeof utils_sanitize;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
