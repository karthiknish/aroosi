"use client";

import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, Clock, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { BlogPost } from "@/types/blog";

// Calculate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Custom renderer for blog content based on slug

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const [post, setPost] = React.useState<BlogPost | undefined>(undefined);
  React.useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      setPost(undefined);
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/blog/${slug}`, { headers });
      if (res.ok) {
        setPost(await res.json());
      } else {
        setPost(undefined);
      }
    }
    fetchPost();
  }, [slug, getToken]);

  if (post === undefined) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-10 w-2/3 rounded" />
        <Skeleton className="h-6 w-1/2 rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
      </div>
    );
  }
  if (post === null || post === undefined) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-pink-700 mb-4">
          Post Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          Sorry, we couldn&apos;t find that blog post.
        </p>
        <Button
          asChild
          variant="outline"
          className="text-pink-600 border-pink-300"
        >
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

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
            className="relative w-full h-64 sm:h-80 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-lg"
          >
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-8">
              <h1
                className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow mb-2"
                style={{ fontFamily: "Lora, serif" }}
              >
                {post.title}
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
            className="w-full h-48 sm:h-64 mb-8 rounded-2xl bg-gradient-to-r from-pink-200 via-rose-100 to-white flex flex-col justify-end p-8"
          >
            <h1
              className="text-3xl sm:text-4xl font-serif font-bold text-pink-700 mb-2"
              style={{ fontFamily: "Lora, serif" }}
            >
              {post.title}
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

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              asChild
              variant="ghost"
              className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            >
              <Link href="/blog" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          <div
            id="blog-content"
            className="shadow-xl rounded-xl p-6 bg-white"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
