import type { BlogPost } from "@/types/blog";

export interface BlogListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
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
   * Get all blog posts with pagination
   */
  async getPosts(params: { 
    page?: number; 
    pageSize?: number; 
    category?: string;
    q?: string;
  } = {}): Promise<BlogListResponse> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", String(params.page));
    if (params.pageSize !== undefined) query.append("pageSize", String(params.pageSize));
    if (params.category) query.append("category", params.category);
    if (params.q) query.append("q", params.q);

    const data = await this.makeRequest(`/api/blog?${query.toString()}`);
    
    if (data && data.success && data.data) {
      return {
        posts: data.data.posts || [],
        total: data.data.total || 0,
        page: data.data.page || 0,
        pageSize: data.data.pageSize || 6,
      };
    }

    return {
      posts: data?.posts || [],
      total: data?.total || 0,
      page: data?.page || 0,
      pageSize: data?.pageSize || 6,
    };
  }

  /**
   * Get a single blog post by slug
   */
  async getPost(slug: string): Promise<BlogPost | null> {
    try {
      const data = await this.makeRequest(`/api/blog/${encodeURIComponent(slug)}`);
      if (data && data.success && data.data) {
        return data.data.post || data.data;
      }
      return data?.post || data || null;
    } catch {
      return null;
    }
  }
}

export const blogAPI = new BlogAPI();
