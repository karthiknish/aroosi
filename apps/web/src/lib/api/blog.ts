/**
 * Blog API - Handles blog post operations
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  author?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface BlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  tags?: string[];
  isPublished?: boolean;
}

class BlogAPI {
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

    return payload;
  }

  /**
   * Get all blog posts
   */
  async getPosts(limit = 20, offset = 0): Promise<{ posts: BlogPost[]; total: number }> {
    const res = await this.makeRequest(`/api/blog?limit=${limit}&offset=${offset}`);
    return {
      posts: res.data?.posts || res.posts || [],
      total: res.data?.total || res.total || 0,
    };
  }

  /**
   * Get a single blog post by slug
   */
  async getPost(slug: string): Promise<BlogPost | null> {
    try {
      const res = await this.makeRequest(`/api/blog/${encodeURIComponent(slug)}`);
      return res.data?.post || res.post || null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new blog post (admin only)
   */
  async createPost(data: BlogPostInput): Promise<BlogPost> {
    return this.makeRequest("/api/blog", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a blog post (admin only)
   */
  async updatePost(slug: string, data: Partial<BlogPostInput>): Promise<BlogPost> {
    return this.makeRequest(`/api/blog/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a blog post (admin only)
   */
  async deletePost(slug: string): Promise<void> {
    return this.makeRequest(`/api/blog/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
  }

  /**
   * Submit user blog content
   */
  async submitUserContent(data: { title: string; content: string; email: string }): Promise<void> {
    return this.makeRequest("/api/blog/user-submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const blogAPI = new BlogAPI();
