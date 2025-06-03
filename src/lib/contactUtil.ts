// Utility to fetch all contacts (admin) and submit contact (public)
export interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export async function fetchAllContactsAdmin(token: string): Promise<Contact[]> {
  // Fetch all contacts for admin users
  const res = await fetch("/api/contact", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch contacts");
  }
  return res.json();
}

export async function submitContactPublic(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  // Submit a contact form for public users
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    return { success: false, error: "Failed to submit contact" };
  }
  return { success: true };
}
