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
import type * as contact from "../contact.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as interests from "../interests.js";
import type * as messages from "../messages.js";
import type * as scripts_cleanupDuplicateClerkUsers from "../scripts/cleanupDuplicateClerkUsers.js";
import type * as scripts_seedTestProfiles from "../scripts/seedTestProfiles.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  contact: typeof contact;
  http: typeof http;
  images: typeof images;
  interests: typeof interests;
  messages: typeof messages;
  "scripts/cleanupDuplicateClerkUsers": typeof scripts_cleanupDuplicateClerkUsers;
  "scripts/seedTestProfiles": typeof scripts_seedTestProfiles;
  storage: typeof storage;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
