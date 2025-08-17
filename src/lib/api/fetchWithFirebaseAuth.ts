import { auth } from "../firebaseClient";

/**
 * Perform a fetch adding a Firebase ID token in the Authorization header.
 * If the user isn't signed in or token retrieval fails, proceeds without header.
 */
export async function fetchWithFirebaseAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let token: string | undefined;
  try {
    const user = auth.currentUser;
    if (user) token = await user.getIdToken();
  } catch (err) {
    console.warn("fetchWithFirebaseAuth: failed to get token", err);
  }
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

/** Convenience helper returning parsed JSON, throwing on non-2xx */
export async function fetchJsonWithFirebaseAuth<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithFirebaseAuth(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json().catch(() => ({}))) as T;
}
