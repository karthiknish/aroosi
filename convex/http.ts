"use strict";

import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount Convex Auth routes at /api/auth (default)
auth.addHttpRoutes(http);

// HTTP routes for the application (add custom webhooks/endpoints here)
// Note: Clerk webhooks removed after migration to Convex Auth

export default http;
