export async function generateMetadata({ params }: { params: { slug: string } }) {
  const title = `Aroosi Blog | ${params.slug.replace(/-/g, " ")}`;
  const description = "Read this story on Aroosi's blog.";
  return {
    title,
    description,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  } as const;
}
"use client";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, Clock, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { showSuccessToast } from "@/lib/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import type { BlogPost } from "@/types/blog";
// Auth context retained for hook order but no token usage in this module
import { useAuthContext } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogPostBySlug } from "@/lib/blogUtil";

// Calculate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Skeleton component for loading state
const BlogDetailSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <Skeleton className="h-64 sm:h-80 md:h-96 mb-8 rounded-2xl w-full" />
    <Skeleton className="h-8 w-1/4 mb-4" /> {/* Categories skeleton */}
    <Card className="mb-8">
      <CardContent className="pt-6">
        <Skeleton className="h-10 w-1/3 mb-6" /> {/* Back button skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  useAuthContext(); // ensure auth hook order; no token usage

  const queryKey = ["blogPost", slug];

  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BlogPost | null, Error, BlogPost | null, (string | null)[]>({
    queryKey: queryKey,
    queryFn: () => fetchBlogPostBySlug(slug, undefined),
    enabled: !!slug,
  });

  if (isLoading) {
    return <BlogDetailSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "Sorry, we couldn't load the blog post."}
        onRetry={() => refetch()}
        className="min-h-[60vh]"
      />
    );
  }

  if (post === null && !isLoading) {
    return <EmptyState message="Post not found." className="min-h-[60vh]" />;
  }

  if (post) {
    const readingTime = getReadingTime(post.content || "");

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
        <div className="mb-8">
          {post.imageUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative w-full h-64 sm:h-80 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-pink-100 via-rose-50 to-yellow-50"
            >
              <div className="absolute left-6 top-6 w-16 h-16 bg-pink-200 rounded-full opacity-30 blur-2xl animate-pulse z-0" />
              <div className="absolute right-6 bottom-6 w-20 h-20 bg-yellow-100 rounded-full opacity-20 blur-2xl animate-pulse z-0" />
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover object-center relative z-10"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-8">
                <h1
                  className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow mb-2 relative"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {post.title}
                  {/* Homepage-style wavy underline */}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="6"
                    viewBox="0 0 200 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 3C50 0.5 150 0.5 200 3"
                      stroke="#fff"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-200">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.createdAt).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {readingTime} min read
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full h-48 sm:h-64 mb-8 rounded-2xl bg-gradient-to-r from-pink-200 via-rose-100 to-white flex flex-col justify-end p-8 shadow relative"
            >
              <div className="absolute left-6 top-6 w-16 h-16 bg-pink-200 rounded-full opacity-30 blur-2xl animate-pulse z-0" />
              <div className="absolute right-6 bottom-6 w-20 h-20 bg-yellow-100 rounded-full opacity-20 blur-2xl animate-pulse z-0" />
              <h1
                className="text-3xl sm:text-4xl font-serif font-bold text-pink-700 mb-2 relative"
                style={{ fontFamily: "Lora, serif" }}
              >
                {post.title}
                {/* Homepage-style wavy underline */}
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
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.createdAt).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.categories.map((cat: string) => (
              <span
                key={cat}
                className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium shadow-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <Card className="mb-8 shadow-xl rounded-2xl border-l-8 border-pink-200 bg-white/90">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <Button
                asChild
                variant="ghost"
                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg"
              >
                <Link href="/blog" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Blog
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg"
                onClick={() => {
                  if (navigator.share) {
                    void navigator.share({
                      title: post.title,
                      text: post.excerpt, // Ensure excerpt is available on BlogPost type
                      url: window.location.href,
                    });
                  } else {
                    showSuccessToast("Link copied to clipboard!");
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
            <article
              className="prose prose-pink max-w-none lg:prose-lg xl:prose-xl"
              dangerouslySetInnerHTML={{
                __html: post.content || "",
              }}
            />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Fallback: Slug not ready, or unexpected state.
  // isLoading handles the case where slug is ready and query is running.
  // This will be hit if slug is initially undefined.
  return <BlogDetailSkeleton />;
}
