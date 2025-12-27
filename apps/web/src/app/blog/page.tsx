"use client";


import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { blogAPI, BlogListResponse } from "@/lib/api/blog";
import { BlogPost } from "@/types/blog";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ui/error-state";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { FileText } from "lucide-react";

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
    refetch,
  } = useQuery<
    BlogListResponse,
    Error,
    BlogListResponse,
    BlogQueryKey
  >({
    queryKey: queryKey,
    queryFn: () => blogAPI.getPosts({ page, pageSize, category }),
  });

  const posts: BlogPost[] = React.useMemo(
    () => blogData?.posts || [],
    [blogData]
  );
  const total: number = React.useMemo(() => blogData?.total || 0, [blogData]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    posts?.forEach((post) => {
      if (Array.isArray(post.categories)) {
        post.categories.forEach((cat: string) => set.add(cat));
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
      <ErrorState
        message="Failed to load blog posts."
        onRetry={() => refetch()}
        className="min-h-[50vh]"
      />
    );
  }

  return (
    <>


      <section className="pt-24 sm:pt-28 md:pt-32 pb-16 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-base/5 relative overflow-hidden">
        {/* Enhanced decorative elements */}
        <div className="absolute left-1/4 top-20 w-32 h-32 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full opacity-40 blur-3xl animate-pulse z-0" />
        <div className="absolute right-1/4 top-32 w-24 h-24 bg-gradient-to-r from-base/20 to-accent/20 rounded-full opacity-30 blur-2xl animate-pulse z-0" />
        <div className="absolute left-1/3 bottom-20 w-20 h-20 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full opacity-25 blur-xl animate-pulse z-0" />

        <div className="container mx-auto px-6 relative z-10">
          <h1
            style={{
              lineHeight: "1.4",
            }}
            className="text-5xl font-serif sm:text-6xl  lg:text-7xl font-bold bg-gradient-to-r from-primary-dark via-secondary to-accent bg-clip-text text-transparent mb-6 leading-tight"
          >
            Matrimonial Blog
          </h1>

          {/* Enhanced wavy underline */}

          <p className="text-xl text-neutral-light max-w-3xl mx-auto mb-8 leading-relaxed">
            Discover inspiring stories, expert advice, and cultural insights to
            guide your journey towards finding your perfect Afghan life partner.
          </p>
          {/* Enhanced search input */}
          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-lg">
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search blog posts..."
                className="w-full px-6 py-7 rounded-2xl border-2 border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-base-light/90 backdrop-blur-sm text-neutral-dark shadow-lg font-sans text-lg transition-all duration-300 placeholder:text-neutral-light"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-primary-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Enhanced category filters */}
          <div className="flex gap-3  py-4 mb-8 justify-center scrollbar-hide">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className={`px-6 py-6 rounded-2xl border-2 transition-all duration-300 text-sm whitespace-nowrap font-semibold transform hover:scale-105 h-auto ${
                  category === cat
                    ? "bg-gradient-to-r from-primary to-secondary text-base-light border-primary shadow-lg shadow-primary/20"
                    : "bg-base-light/90 backdrop-blur-sm text-primary-dark border-primary/20 hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:border-primary/30 shadow-md"
                }`}
                onClick={() => {
                  setCategory(cat);
                  setPage(0);
                }}
              >
                {cat === "all" ? "All Categories" : cat}
              </Button>
            ))}
          </div>

          <div className="inline-flex items-center px-4 py-2 bg-base-light/80 backdrop-blur-sm rounded-full border border-primary/20 text-sm text-neutral shadow-sm">
            <span className="font-medium text-primary-dark">
              {filteredPosts.length}
            </span>
            <span className="mx-1">of</span>
            <span className="font-medium text-primary-dark">{total}</span>
            <span className="ml-1">posts found</span>
          </div>
        </div>
      </section>
      {/* Decorative section break */}

      <div className="px-6 py-16 bg-gradient-to-b from-base-light via-primary/5 to-accent/5 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-gradient-to-r from-accent/10 to-base/10 rounded-full blur-2xl" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <Card
                  key={i}
                  className="bg-base-light rounded-3xl overflow-hidden flex flex-col animate-pulse shadow-xl border-0 hover:shadow-2xl transition-all z-10"
                >
                  <Skeleton className="w-full h-48 object-cover rounded-t-3xl" />
                  <div className="flex-1 p-6 flex flex-col">
                    <Skeleton className="h-7 w-2/3 rounded-lg mb-3" />
                    <Skeleton className="h-4 w-1/3 rounded mb-3" />
                    <Skeleton className="h-4 w-full rounded mb-2" />
                    <Skeleton className="h-4 w-3/4 rounded mb-4" />
                    <div className="flex gap-2 mt-auto">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </Card>
              ))
            ) : filteredPosts.length === 0 && !isLoading ? (
              <Empty className="col-span-full">
                <EmptyIcon icon={FileText} />
                <EmptyTitle>No posts found</EmptyTitle>
                <EmptyDescription>
                  We couldn&apos;t find any blog posts matching your search or category selection.
                </EmptyDescription>
              </Empty>
            ) : (
              filteredPosts.map((post: BlogPost) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
                  className="group block focus:outline-none focus:ring-4 focus:ring-primary/20 rounded-3xl transition-all"
                  tabIndex={0}
                >
                  {/* Removed duplicate Card tag, only one Card remains below */}
                  <Card className="h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 bg-base-light rounded-3xl overflow-hidden flex flex-col group cursor-pointer relative z-10">
                    {/* Enhanced decorative elements */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/30 rounded-full opacity-70 group-hover:opacity-100 transition-opacity z-10" />
                    <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-br from-accent/20 to-base/20 rounded-full opacity-60 group-hover:scale-110 transition-transform z-10" />

                    {post.imageUrl && /^https?:\/\//.test(post.imageUrl) && (
                      <div className="relative overflow-hidden rounded-t-3xl">
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (!el.dataset.fallback) {
                              el.dataset.fallback = "1";
                              el.src = "/placeholder.jpg";
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    )}

                    <CardHeader className="flex-1 p-6">
                      <CardTitle className="text-lg font-serif font-semibold text-neutral-dark mb-3 line-clamp-2 group-hover:text-primary-dark transition-colors">
                        {post.title}
                      </CardTitle>

                      <div className="flex items-center gap-2 text-sm text-neutral-light mb-3">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>

                      <p className="text-neutral text-sm line-clamp-3 mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>

                      {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {post.categories.slice(0, 2).map((cat: string) => (
                            <span
                              key={cat}
                              className="px-3 py-1 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary-dark rounded-full text-xs font-semibold border border-primary/20"
                            >
                              {cat}
                            </span>
                          ))}
                          {post.categories.length > 2 && (
                            <span className="px-3 py-1 bg-neutral/10 text-neutral rounded-full text-xs font-medium">
                              +{post.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))
            )}
          </div>
          {/* Enhanced pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-16">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="px-6 py-3 rounded-2xl border-2 border-primary/20 bg-base-light/80 backdrop-blur-sm hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:border-primary/30 transition-all duration-300 font-semibold"
              >
                ← Previous
              </Button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={i === page ? "default" : "outline"}
                    className={`px-4 py-6 h-auto rounded-2xl border-2 text-sm font-semibold transition-all duration-300 ${
                      i === page
                        ? "bg-gradient-to-r from-primary to-secondary text-base-light border-primary shadow-lg shadow-primary/20 transform scale-110"
                        : "bg-base-light/80 backdrop-blur-sm text-primary-dark border-primary/20 hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:border-primary/30 hover:scale-105"
                    }`}
                    onClick={() => setPage(i)}
                    disabled={i === page}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages || isLoading}
                className="px-6 py-3 rounded-2xl border-2 border-primary/20 bg-base-light/80 backdrop-blur-sm hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:border-primary/30 transition-all duration-300 font-semibold"
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
