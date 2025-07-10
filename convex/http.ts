"use strict";

import { httpRouter } from "convex/server";

const http = httpRouter();

// HTTP routes for the application
// Clerk webhook handlers have been removed as we now use native authentication

export default http;
