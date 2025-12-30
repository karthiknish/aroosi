import type { BlogPost } from "@/types/blog";

export type BlogListResponse = {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Admin Blog API - Handles admin blog management
 */
class AdminBlogAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const headers: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
        : baseHeaders;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data;
        }
      }
    }

    return payload;
  }

  /**
   * List blog posts with pagination and optional category filter
   */
  async list(params: {
    page?: number;
    pageSize?: number;
    category?: string;
  } = {}): Promise<BlogListResponse> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", String(params.page));
    if (params.pageSize !== undefined) query.append("pageSize", String(params.pageSize));
    if (params.category) query.append("category", params.category);

    const data = await this.makeRequest(`/api/blog?${query.toString()}`);

    // Normal shape after unwrapping: { posts, total, page, pageSize }
    if (data && typeof data === "object" && Array.isArray((data as any).posts)) {
      const posts = (data as any).posts as BlogPost[];
      return {
        posts,
        total: Number((data as any).total ?? posts.length) || 0,
        page: Number((data as any).page ?? 0) || 0,
        pageSize: Number((data as any).pageSize ?? posts.length ?? 6) || 6,
      };
    }

    // Fallback for array format or other shapes
    const posts = Array.isArray(data)
      ? (data as BlogPost[])
      : Array.isArray((data as any)?.posts)
        ? ((data as any).posts as BlogPost[])
        : [];

    return {
      posts,
      total: posts.length,
      page: 0,
      pageSize: posts.length || 6,
    };
  }

  /**
   * Get a single blog post by ID or slug
   */
  async get(idOrSlug: string): Promise<BlogPost | null> {
    try {
      const data = await this.makeRequest(`/api/blog/${encodeURIComponent(idOrSlug)}`, {
        cache: "no-store",
      });

      if (data && typeof data === "object" && "data" in data) {
        return data.data as BlogPost;
      }
      return data as BlogPost;
    } catch (err) {
      // Treat 404 as not found
      if ((err as any).message?.includes("404")) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Create a new blog post
   */
  async create(post: Omit<BlogPost, "_id" | "createdAt" | "updatedAt">): Promise<BlogPost> {
    const data = await this.makeRequest("/api/blog", {
      method: "POST",
      body: JSON.stringify(post),
    });
    return data.data || data;
  }

  /**
   * Update an existing blog post
   */
  async update(
    id: string,
    updates: Partial<Omit<BlogPost, "_id" | "createdAt" | "updatedAt">>
  ): Promise<BlogPost> {
    const data = await this.makeRequest(`/api/blog/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ _id: id, ...updates }),
    });
    return data.data || data;
  }

  /**
   * Delete a blog post
   */
  async delete(id: string): Promise<void> {
    await this.makeRequest("/api/blog", {
      method: "DELETE",
      body: JSON.stringify({ _id: id }),
    });
  }

  /**
   * Upload blog image
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/images/blog", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload image: ${res.status}`);
    }

    const data = await res.json();
    return { url: data.url || data.data?.url || "" };
  }

  /**
   * Proxy image URL
   */
  getProxyUrl(imageUrl: string): string {
    return `/api/images/blog/proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  /**
   * Convert AI text (excerpt/category) to plain text via server-side Gemini call
   */
  async convertAiTextToHtml(text: string, type: "excerpt" | "category" | "title" | "blog"): Promise<string> {
    const trimmed = (text || "").trim();
    if (!trimmed) return "";

    const data = await this.makeRequest("/api/convert-ai-text-to-html", {
      method: "POST",
      body: JSON.stringify({ text: trimmed, type }),
    });

    return data.html || "";
  }

  /**
   * Convert arbitrary text to markdown using Gemini
   */
  async convertTextToMarkdown(text: string, prompt?: string): Promise<string> {
    const data = await this.makeRequest("/api/convert-markdown", {
      method: "POST",
      body: JSON.stringify({ text, prompt }),
    });

    return data.markdown ?? data.data?.markdown ?? "";
  }
}

export const adminBlogAPI = new AdminBlogAPI();
