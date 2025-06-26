// Blog utility functions for public and admin blog APIs

import type { BlogPost } from "@/types/blog";

type BlogApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

// Fetch paginated blog posts (public, no auth required)
export async function fetchBlogPosts({
  page = 0,
  pageSize = 6,
  category,
  token,
}: {
  page?: number;
  pageSize?: number;
  category?: string;
  token?: string;
} = {}): Promise<BlogPost[]> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (category) params.append("category", category);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/blog?${params.toString()}`, { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch blog posts");
  }
  // Support multiple envelope shapes
  // 1. Bare array
  if (Array.isArray(data)) return data;

  // 2. { data: BlogPost[] }
  if (data && Array.isArray(data.data)) return data.data;

  // 3. { posts: BlogPost[] }
  if (data && Array.isArray(data.posts)) return data.posts;

  // 4. { success: true, data: { posts: BlogPost[] } }
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    data.data &&
    Array.isArray((data.data as unknown as { posts?: unknown[] }).posts)
  ) {
    return (data.data as { posts: BlogPost[] }).posts;
  }
  return [];
}

// Admin: Fetch paginated blog posts with auth
export async function fetchAdminBlogPosts({
  token,
  page = 0,
  pageSize = 10,
  category,
}: {
  token: string;
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<BlogPost[]> {
  return fetchBlogPosts({ page, pageSize, category, token });
}

// Create a new blog post (requires auth)
export async function createBlogPost(
  token: string,
  post: Omit<BlogPost, "_id" | "createdAt" | "updatedAt">
): Promise<BlogApiResponse<BlogPost>> {
  const res = await fetch("/api/blog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(post),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || "Failed to create blog post",
    };
  }
  return { success: true, data };
}

// Delete a blog post by _id (requires auth)
export async function deleteBlogPost(
  token: string,
  _id: string
): Promise<BlogApiResponse<unknown>> {
  const res = await fetch("/api/blog", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ _id }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || "Failed to delete blog post",
    };
  }
  return { success: true, data };
}
// Edit a blog post by _id (requires auth)
export async function editBlogPost(
  token: string,
  _id: string,
  updates: Partial<Omit<BlogPost, "_id" | "createdAt" | "updatedAt">>
): Promise<BlogApiResponse<BlogPost>> {
  const res = await fetch("/api/blog", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ _id, ...updates }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || "Failed to edit blog post",
    };
  }
  return { success: true, data };
}

// Admin: Delete a blog post by _id (admin endpoint, requires auth)

// Fetch a single blog post by id (optionally with admin token)
export async function fetchBlogPostById(
  id: string,
  token?: string
): Promise<BlogPost | null> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/blog/${id}`, {
    headers,
  });
  const data = await res.json();

  if (!res.ok || !data) return null;
  // If the API returns { data: BlogPost }, return data.data; else, return data
  if (data && data.data) return data.data;
  return data;
}

// Fetch a single blog post by slug (optionally with admin token)
export async function fetchBlogPostBySlug(
  slug: string,
  token?: string
): Promise<BlogPost | null> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok || !data) return null;
  // If the API returns { data: BlogPost }, return data.data; else, return data
  if (data && data.data) return data.data;
  return data;
}

// Upload blog image metadata and get public URL (requires admin token)
export async function uploadBlogImageMeta({
  token,
  storageId,
  fileName,
  contentType,
  fileSize,
}: {
  token: string;
  storageId: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
}): Promise<string> {
  const res = await fetch("/api/images/blog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ storageId, fileName, contentType, fileSize }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to register blog image");
  }
  // Support shapes { url } or { data: { url } }
  const url =
    data?.url ??
    (data?.data && (data.data as { url?: string }).url) ??
    (data?.data?.url as string | undefined);
  if (!url) {
    throw new Error("Image URL missing in response");
  }
  return url;
}

// Convert AI text (excerpt/category) to plain text via server-side Gemini call
export async function convertAiTextToHtml({
  token,
  text,
  type,
}: {
  token: string;
  text: string;
  type: "excerpt" | "category";
}): Promise<string> {
  const res = await fetch("/api/convert-ai-text-to-html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, type }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "AI processing failed");
  }
  // Extract and return plain text from returned HTML
  if (typeof data?.html === "string") {
    const temp = document.createElement("div");
    temp.innerHTML = data.html;
    const plain = temp.textContent || temp.innerText || "";
    return plain.trim();
  }
  return "";
}

// Convert arbitrary text to markdown using Gemini
export async function convertTextToMarkdown({
  token,
  text,
  prompt,
}: {
  token: string;
  text: string;
  prompt?: string;
}): Promise<string> {
  const res = await fetch("/api/convert-markdown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, prompt }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to convert to markdown");
  }
  return data?.markdown ?? data?.data?.markdown ?? "";
}
