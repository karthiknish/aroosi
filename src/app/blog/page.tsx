"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogPost } from "@/types/blog";
import { useQuery } from "@tanstack/react-query";

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
  const json = await res.json();
  // The API wraps data in { success, data }
  const payload =
    json && typeof json === "object" && "data" in json ? json.data : json;
  return payload as { posts: BlogPost[]; total: number };
};

export default function BlogPage() {
  const [page, setPage] = React.useState(0);
  const pageSize = 6;
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");

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

  // Filter posts by search (client-side)
  const filteredPosts = React.useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.trim().toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q))
    );
  }, [posts, search]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isError) {
    return (
      <div className="text-center py-10 text-red-600">
        Failed to load blog posts. Please try again later.
      </div>
    );
  }

  return (
    <>
      <section className="pt-24 sm:pt-28 md:pt-32 mb-12 text-center bg-gradient-to-b from-pink-50 via-white to-white relative overflow-x-clip">
        {/* Decorative color pop */}
        <div className="absolute left-10 top-10 w-24 h-24 bg-pink-200 rounded-full opacity-30 blur-2xl animate-pulse z-0" />
        <div className="absolute right-10 bottom-10 w-32 h-32 bg-yellow-100 rounded-full opacity-20 blur-2xl animate-pulse z-0" />
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-pink-600 mb-2 drop-shadow relative z-10">
          Matrimonial Blog
        </h1>
        {/* Wavy underline SVG */}
        <div className="flex justify-center mb-4 relative z-10">
          <svg
            className="absolute -bottom-2 left-0 w-full"
            height="6"
            viewBox="0 0 200 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 3C50 0.5 150 0.5 200 3"
              stroke="#FDA4AF"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6 relative z-10">
          Advice, inspiration, and real stories for UK singles and families.
          Discover how to make the most of your Aroosi journey.
        </p>
        {/* Search input */}
        <div className="flex justify-center mb-6 relative z-10">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search blog posts..."
            className="w-full max-w-md px-4 py-2 rounded-full border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 bg-white text-gray-700 shadow-sm font-sans text-base transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto py-2 mb-8 justify-center scrollbar-hide relative z-10">
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
        <div className="text-sm text-gray-500 mb-2 relative z-10">
          Showing {filteredPosts.length} of {total} posts
        </div>
      </section>
      {/* Decorative section break */}

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
          ) : filteredPosts.length === 0 && !isLoading ? (
            <div className="col-span-full text-center py-10 text-gray-600">
              No posts found for this search or category.
            </div>
          ) : (
            filteredPosts.map((post: BlogPost) => (
              <Link
                key={post._id}
                href={`/blog/${post.slug}`}
                className="group block focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-2xl"
                tabIndex={0}
              >
                <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col group cursor-pointer relative">
                  {/* Color pop circle */}
                  <div className="absolute -top-6 left-6 w-12 h-12 bg-pink-100 rounded-full z-10 shadow-md" />
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-40  object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-2xl"
                    />
                  )}
                  <CardHeader className="flex-1">
                    <CardTitle className="text-md font-serif text-neutral font-medium mb-1">
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
        {/* Pagination with page numbers */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-12 mb-16">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${
                  i === page
                    ? "bg-pink-600 text-white border-pink-600 shadow"
                    : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"
                }`}
                onClick={() => setPage(i)}
                disabled={i === page}
              >
                {i + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
