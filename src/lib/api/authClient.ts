export async function authFetch(input: string, init: RequestInit = {}) {
  const resp = await fetch(input, {
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  const cid = resp.headers.get("x-correlation-id") || "-";
  const dbg = {
    host: resp.headers.get("x-debug-host"),
    cookie: resp.headers.get("x-debug-cookie"),
    domainHint: resp.headers.get("x-debug-domain-hint"),
    reason: resp.headers.get("x-debug-reason"),
  };

  try {
    // Lightweight client-side visibility; avoid PII
    console.groupCollapsed(`[auth] ${input} -> ${resp.status} cid=${cid}`);
    console.log("Headers", dbg);
    let preview: unknown = null;
    try {
      preview = await resp.clone().json();
    } catch {
      preview = "(no JSON body)";
    }
    console.log("Body preview", preview);
    console.groupEnd();
  } catch {
    // ignore console failures
  }

  return resp;
}