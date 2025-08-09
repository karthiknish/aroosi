import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount Convex Auth routes at /api/auth (default)
auth.addHttpRoutes(http);

export default http;