import { GoogleAuth, JWT } from "google-auth-library";

/**
 * Obtain an OAuth2 access token for the Google Play Developer API using a service account.
 * Credentials source (first match wins):
 * - ANDROID_PUBLISHER_CREDENTIALS: JSON string or base64-encoded JSON of the service account key
 * - GOOGLE_APPLICATION_CREDENTIALS: path to a JSON key file (handled by GoogleAuth)
 *
 * Scope: https://www.googleapis.com/auth/androidpublisher
 */
export async function getAndroidPublisherAccessToken(): Promise<string> {
  const scope = "https://www.googleapis.com/auth/androidpublisher";

  // Try explicit JSON from env first (string or base64)
  const raw = process.env.ANDROID_PUBLISHER_CREDENTIALS;
  if (raw && raw.trim().length > 0) {
    let jsonStr = raw.trim();
    // Heuristic: if it doesn't look like JSON, try base64 decode
    if (!jsonStr.startsWith("{") || !jsonStr.endsWith("}")) {
      try {
        const decoded = Buffer.from(jsonStr, "base64").toString("utf8");
        if (decoded.trim().startsWith("{") && decoded.trim().endsWith("}")) {
          jsonStr = decoded.trim();
        }
      } catch {
        // ignore, will fail below if not valid JSON
      }
    }
    try {
      const credentials = JSON.parse(jsonStr);
      const client = (await new GoogleAuth({ scopes: [scope] }).fromJSON(
        credentials
      )) as JWT | any;
      // Some client types (JWT) require setting scopes explicitly
      if ((client as JWT).scopes == null) {
        (client as JWT).scopes = [scope];
      }
      const token = await client.getAccessToken();
      if (!token) throw new Error("Failed to obtain access token from credentials JSON");
      return token as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Invalid ANDROID_PUBLISHER_CREDENTIALS (must be JSON or base64 JSON): ${msg}`
      );
    }
  }

  // Fallback: rely on Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS path)
  const auth = new GoogleAuth({ scopes: [scope] });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Failed to obtain Google application default access token");
  return token;
}
