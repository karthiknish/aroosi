import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { useState } from "react";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  categories?: string[];
}

interface BlogPostsProps {
  posts: BlogPost[] | undefined;
  setEditingPost: (id: string | null) => void;
  deletePost: (id: string) => void;
  loading: boolean;
}

export function BlogPosts({
  posts,
  setEditingPost,
  deletePost,
  loading,
}: BlogPostsProps) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const total = posts?.length || 0;
  const pageCount = Math.ceil(total / pageSize);
  const pagedPosts = posts
    ? posts.slice(page * pageSize, (page + 1) * pageSize)
    : [];

  // Utility for excerpt/category (plain text)
  const getReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200); // Assuming 200 words per minute reading speed
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blog Posts</CardTitle>
        <CardDescription>Manage your blog content</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-4 bg-white rounded-lg border border-gray-200 flex flex-col gap-3 h-full"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-2/3 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <div className="flex gap-4 mt-2">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-4 w-10 rounded" />
                      <Skeleton className="h-4 w-10 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts === undefined ? (
          <div className="text-center py-8 text-gray-500">No posts yet</div>
        ) : (
          <>
            <div className="space-y-4">
              {pagedPosts.map((post) => (
                <div
                  key={post._id}
                  className="p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getReadingTime(post.content)} min read
                        </div>
                      </div>
                      {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPost(post._id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deletePost(post._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {page + 1} of {pageCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => (p + 1 < pageCount ? p + 1 : p))
                  }
                  disabled={page + 1 >= pageCount}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
