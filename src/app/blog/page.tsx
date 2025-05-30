"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogPost } from "@/types/blog";
import { useQuery, QueryKey } from "@tanstack/react-query";

// Explicit return type for the fetch function
const fetchBlogPostsAPI = async (
  page: number,
  pageSize: number,
  category: string
): Promise<{ posts: BlogPost[]; total: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category !== "all") params.append("category", category);
  const res = await fetch(`/api/blog?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch blog posts");
  }
  return res.json();
};

export default function BlogPage() {
  const [page, setPage] = React.useState(0);
  const pageSize = 6;
  const [category, setCategory] = React.useState("all");

  type BlogQueryKey = [string, number, string, number];
  const queryKey: BlogQueryKey = ["blogPosts", page, category, pageSize];

  const {
    data: blogData,
    isLoading,
    isError,
  } = useQuery<
    { posts: BlogPost[]; total: number }, // TQueryFnData: type returned by queryFn
    Error, // TError
    { posts: BlogPost[]; total: number }, // TData: type of 'data'
    BlogQueryKey // TQueryKey
  >({
    queryKey: queryKey,
    queryFn: () => fetchBlogPostsAPI(page, pageSize, category),
    // placeholderData: (previousData) => previousData, // Or keepPreviousData: true for TanStack Query v4/v5
    // Adding this back once base logic is confirmed
  });

  const posts: BlogPost[] = blogData?.posts || [];
  const total: number = blogData?.total || 0;

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    posts?.forEach((post) => {
      if (Array.isArray(post.categories)) {
        post.categories.forEach((cat) => set.add(cat));
      }
    });
    return ["all", ...Array.from(set).sort()];
  }, [posts]);

  if (isError) {
    return (
      <div className="text-center py-10 text-red-600">
        Failed to load blog posts. Please try again later.
      </div>
    );
  }

  return (
    <>
      <section className="pt-24 sm:pt-28 md:pt-32 mb-12 text-center bg-gradient-to-b from-pink-50 via-white to-white">
        <h1
          className="text-4xl sm:text-5xl font-serif font-bold text-pink-600 mb-4 drop-shadow"
          style={{ fontFamily: "Lora, serif" }}
        >
          Matrimonial Blog
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          Advice, inspiration, and real stories for UK singles and families.
          Discover how to make the most of your Aroosi journey.
        </p>
        <div className="flex gap-2 overflow-x-auto py-2 mb-8 justify-center scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-1 rounded-full border transition text-sm whitespace-nowrap font-medium ${category === cat ? "bg-pink-600 text-white border-pink-600 shadow" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"}`}
              onClick={() => {
                setCategory(cat);
                setPage(0); // Reset to first page when category changes
              }}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500 mb-2">
          Showing {posts.length} of {total} posts
        </div>
      </section>
      <div className="px-2 sm:px-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <Card
                key={i}
                className="bg-white/90 rounded-2xl overflow-hidden flex flex-col animate-pulse shadow"
              >
                <Skeleton className="w-full h-40 object-cover rounded-t-2xl" />
                <div className="flex-1 p-4 flex flex-col">
                  <Skeleton className="h-6 w-2/3 rounded mb-2" />
                  <Skeleton className="h-4 w-1/3 rounded mb-2" />
                  <Skeleton className="h-4 w-full rounded mb-2" />
                  <Skeleton className="h-4 w-3/4 rounded mb-2" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-4 w-10 rounded" />
                    <Skeleton className="h-4 w-10 rounded" />
                  </div>
                </div>
              </Card>
            ))
          ) : posts.length === 0 && !isLoading ? (
            <div className="col-span-full text-center py-10 text-gray-600">
              No posts found for this category.
            </div>
          ) : (
            posts.map((post: BlogPost) => (
              <Link
                key={post._id}
                href={`/blog/${post.slug}`}
                className="group block focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-2xl"
                tabIndex={0}
              >
                <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col group cursor-pointer">
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <CardHeader className="flex-1">
                    <CardTitle
                      className="text-xl font-serif text-gray-900 mb-1"
                      style={{ fontFamily: "Lora, serif" }}
                    >
                      {post.title}
                    </CardTitle>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(post.createdAt).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3 mb-2">
                      {post.excerpt}
                    </p>
                    {post.categories && post.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.categories.map((cat: string) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>
        {total > pageSize && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 max-w-md mx-auto justify-center mt-12 mb-16">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) =>
                  p + 1 < Math.ceil(total / pageSize) ? p + 1 : p
                )
              }
              disabled={page + 1 >= Math.ceil(total / pageSize) || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
