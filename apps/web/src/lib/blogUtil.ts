// Blog utility functions for public and admin blog APIs

import type { BlogPost } from "@/types/blog";
import { getJson, postJson, putJson, deleteJson } from "@/lib/http/client";

type BlogApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

export type BlogListResponse = {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
};

// Fetch paginated blog posts (public, no auth required)
export async function fetchBlogPosts({
  page = 0,
  pageSize = 6,
  category,
  token: _token,
}: {
  page?: number;
  pageSize?: number;
  category?: string;
  token?: string;
} = {}): Promise<BlogListResponse> {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  if (category) params.append("category", category);

  const data = (await getJson(`/api/blog?${params.toString()}`)) as any;

  // Handle the wrapped response format {success: true, data: {posts, total, page, pageSize}}
  if (data && data.success && data.data) {
    return {
      posts: data.data.posts || [],
      total: data.data.total || 0,
      page: data.data.page || 0,
      pageSize: data.data.pageSize || 6,
    };
  }

  // Fallback for direct data format or other shapes
  const posts = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.posts)
        ? data.posts
        : [];

  return {
    posts,
    total: posts.length,
    page: 0,
    pageSize: posts.length || 6,
  };
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
}): Promise<BlogListResponse> {
  return fetchBlogPosts({ page, pageSize, category, token });
}

// Create a new blog post (requires auth)
export async function createBlogPost(
  _token: string,
  post: Omit<BlogPost, "_id" | "createdAt" | "updatedAt">
): Promise<BlogApiResponse<BlogPost>> {
  try {
    const data = (await postJson("/api/blog", post)) as unknown;
    if (!(data as Record<string, unknown>)?.success) {
      return {
        success: false,
        error:
          ((data as Record<string, unknown>)?.error as string) ||
          "Failed to create blog post",
      };
    }
    return {
      success: true,
      data: (data as { data?: BlogPost }).data as BlogPost,
    };
  } catch (err) {
    const status = (err as any)?.status as number | undefined;
    if (status === 409) {
      return {
        success: false,
        error: "Slug already exists. Please choose a different slug.",
      };
    }
    return {
      success: false,
      error: (err as Error)?.message || "Failed to create blog post",
    };
  }
}

// Delete a blog post by _id (requires auth)
export async function deleteBlogPost(
  _token: string,
  _id: string
): Promise<BlogApiResponse<unknown>> {
  const data = (await deleteJson("/api/blog", {
    body: JSON.stringify({ _id }),
  })) as unknown;
  if (!(data as Record<string, unknown>)?.success) {
    return {
      success: false,
      error:
        ((data as Record<string, unknown>)?.error as string) ||
        "Failed to delete blog post",
    };
  }
  return { success: true, data };
}
// Edit a blog post by _id (requires auth)
export async function editBlogPost(
  _token: string,
  _id: string,
  updates: Partial<Omit<BlogPost, "_id" | "createdAt" | "updatedAt">>
): Promise<BlogApiResponse<BlogPost>> {
  const data = (await putJson(`/api/blog/${encodeURIComponent(_id)}`, {
    _id,
    ...updates,
  })) as unknown;
  if (!(data as Record<string, unknown>)?.success) {
    return {
      success: false,
      error:
        ((data as Record<string, unknown>)?.error as string) ||
        "Failed to edit blog post",
    };
  }
  return {
    success: true,
    data: (data as { data?: BlogPost }).data as BlogPost,
  };
}

// Admin: Delete a blog post by _id (admin endpoint, requires auth)

// Fetch a single blog post by id (optionally with admin token)
export async function fetchBlogPostById(
  id: string,
  _token?: string
): Promise<BlogPost | null> {
  const data = (await getJson(
    `/api/blog/${encodeURIComponent(id)}`
  )) as unknown;
  if (!data) return null;
  // If the API returns { data: BlogPost }, return data.data; else, return data
  if (
    data &&
    typeof data === "object" &&
    "data" in (data as Record<string, unknown>)
  )
    return (data as { data: BlogPost }).data;
  return data as BlogPost;
}

// Fetch a single blog post by slug (optionally with admin token)
export async function fetchBlogPostBySlug(
  slug: string,
  _token?: string
): Promise<BlogPost | null> {
  // Firestore-backed API returns { success, data } where data is the post
  try {
    console.log(`[fetchBlogPostBySlug] Fetching blog post for slug: "${slug}"`);
    // Bypass HTTP cache to avoid 304 handling issues
    const data = (await getJson(`/api/blog/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    })) as unknown;
    if (!data) {
      console.log(`[fetchBlogPostBySlug] No data returned for slug: "${slug}"`);
      return null;
    }
    if (
      data &&
      typeof data === "object" &&
      "data" in (data as Record<string, unknown>)
    ) {
      const post = (data as { data: BlogPost }).data;
      console.log(`[fetchBlogPostBySlug] Found post via data wrapper:`, {
        id: post._id,
        title: post.title,
      });
      return post;
    }
    const post = data as BlogPost;
    console.log(`[fetchBlogPostBySlug] Found post directly:`, {
      id: post._id,
      title: post.title,
    });
    return post;
  } catch (err) {
    const status = (err as any)?.status;
    console.error(
      `[fetchBlogPostBySlug] Error fetching blog post for slug "${slug}":`,
      err
    );
    // Treat 304 as stale cache; retry once with a cache-busting param
    if (status === 304) {
      try {
        const bust = Date.now();
        const data2 = (await getJson(
          `/api/blog/${encodeURIComponent(slug)}?v=${bust}`,
          { cache: "no-store" }
        )) as unknown;
        if (
          data2 &&
          typeof data2 === "object" &&
          "data" in (data2 as Record<string, unknown>)
        ) {
          return (data2 as { data: BlogPost }).data;
        }
        return (data2 as BlogPost) || null;
      } catch (e2) {
        console.error(
          `[fetchBlogPostBySlug] Retry after 304 failed for slug "${slug}":`,
          e2
        );
        return null;
      }
    }
    // Treat 404 as a not-found post rather than a hard error
    if (status === 404) {
      console.log(
        `[fetchBlogPostBySlug] Blog post not found (404) for slug: "${slug}"`
      );
      return null;
    }
    throw err;
  }
}

// User: submit a blog post draft for admin review
export async function submitUserBlogPostDraft(
  post: Omit<BlogPost, "_id" | "createdAt" | "updatedAt"> & { excerpt?: string }
): Promise<BlogApiResponse<{ id: string }>> {
  const data = (await postJson("/api/blog/user-submissions", post)) as unknown;
  if (!(data as Record<string, unknown>)?.success) {
    return {
      success: false,
      error:
        ((data as Record<string, unknown>)?.error as string) ||
        "Failed to submit blog draft",
    };
  }
  const payload = (data as { data?: { id: string } }).data as
    | { id: string }
    | undefined;
  if (!payload?.id) return { success: true, data: { id: "" } };
  return { success: true, data: payload };
}

// Upload blog image metadata and get public URL (requires admin token)
export async function uploadBlogImageMeta({
  token: _token,
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
  const data = (await postJson("/api/images/blog", {
    storageId,
    fileName,
    contentType,
    fileSize,
  })) as unknown;
  // Support shapes { url } or { data: { url } }
  const url =
    (data as { url?: string })?.url ??
    ((data as { data?: { url?: string } })?.data?.url as string | undefined);
  if (!url) {
    throw new Error("Image URL missing in response");
  }
  return url;
}

// Convert AI text (excerpt/category) to plain text via server-side Gemini call
export async function convertAiTextToHtml({
  token: _token,
  text,
  type,
}: {
  token: string;
  text: string;
  type: "excerpt" | "category" | "title" | "blog";
}): Promise<string> {
  const trimmed = (text || "").trim();
  // Allow very short input for title/category; still prevent empty
  if (!trimmed) return "";
  const res = await fetch("/api/convert-ai-text-to-html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmed, type }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "AI processing failed");
  }
  // Server returns { html: string }; for title/excerpt/category this is plain text
  if (typeof data?.html === "string") {
    return data.html;
  }
  return "";
}

// Convert arbitrary text to markdown using Gemini
export async function convertTextToMarkdown({
  token: _token,
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
      // Cookie-based session; no Authorization header
    },
    body: JSON.stringify({ text, prompt }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to convert to markdown");
  }
  return data?.markdown ?? data?.data?.markdown ?? "";
}
