export const successResponse = <T = unknown>(data?: T, status = 200) =>
  new Response(
    JSON.stringify({ success: true, ...(data !== undefined ? { data } : {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );

export const errorResponse = (
  error: unknown,
  status = 400,
  extra?: Record<string, unknown>
) => {
  const isDev = process.env.NODE_ENV === "development";
  // Only expose detailed error messages in development to avoid leaking internal details.
  const message = isDev
    ? typeof error === "string"
      ? error
      : error instanceof Error && error.message
        ? error.message
        : "Unknown error"
    : "Something went wrong";

  return new Response(
    JSON.stringify({ success: false, error: message, ...(extra ?? {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
};
