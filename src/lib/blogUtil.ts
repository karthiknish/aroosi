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
}: { page?: number; pageSize?: number; category?: string } = {}): Promise<
  BlogPost[]
> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (category) params.append("category", category);

  const res = await fetch(`/api/blog?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch blog posts");
  }
  // If the API returns { data: BlogPost[] }, return data.data; else, return data
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.posts)) return data.posts;
  return [];
}

// Admin: Fetch paginated blog posts (admin endpoint, requires auth)

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
