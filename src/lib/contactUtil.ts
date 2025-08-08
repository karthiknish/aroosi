// Utility to fetch all contacts (admin) and submit contact (public)
import { getJson, postJson } from "@/lib/http/client";
export interface Contact {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export async function fetchAllContactsAdmin(
  _token: string,
  opts?: { page?: number; pageSize?: number }
): Promise<Contact[]> {
  // Build optional pagination query string if provided
  let url = "/api/contact";
  const params = new URLSearchParams();
  if (opts?.page && opts.page > 0) params.set("page", String(opts.page));
  if (opts?.pageSize && opts.pageSize > 0)
    params.set("pageSize", String(opts.pageSize));
  if ([...params.keys()].length > 0) url += `?${params.toString()}`;

  // Fetch all contacts for admin users
  const data = await getJson<Contact[]>(url, {
    headers: { "Content-Type": "application/json" },
  });
  // Map to ensure each has id field for React keys
  return (data as Contact[]).map((c) => ({ ...c, id: c.id || c._id || "" }));
}

export async function submitContactPublic(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  // Submit a contact form for public users
  await postJson("/api/contact", data);
  return { success: true };
}
