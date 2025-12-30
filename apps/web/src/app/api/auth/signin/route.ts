// Alias route for backward compatibility.
// Some clients call /api/auth/signin, but the canonical handler lives at /api/auth/login.

export { POST } from "../login/route";
