/**
 * Blog API Service
 */

import { api, ApiResponse } from './client';

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    content: string;
    author: {
        name: string;
        photoURL?: string;
    };
    category: string;
    image?: string;
    publishedAt: number;
}

/**
 * Get all blog posts
 */
export async function getBlogPosts(page = 1, limit = 10): Promise<ApiResponse<{ posts: BlogPost[]; total: number }>> {
    return api.get<{ posts: BlogPost[]; total: number }>(`/blog?page=${page}&limit=${limit}`);
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<ApiResponse<BlogPost>> {
    return api.get<BlogPost>(`/blog/${slug}`);
}

/**
 * Get user submissions (if applicable)
 */
export async function getBlogUserSubmissions(): Promise<ApiResponse<BlogPost[]>> {
    return api.get<BlogPost[]>('/blog/user-submissions');
}
