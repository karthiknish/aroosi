export const successResponse = <T = unknown>(data?: T, status = 200) =>
  new Response(
    JSON.stringify({ success: true, ...(data !== undefined ? { data } : {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );

export const errorResponse = (
  error: string,
  status = 400,
  extra?: Record<string, unknown>
) =>
  new Response(JSON.stringify({ success: false, error, ...(extra ?? {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
