"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";
import { Share2, Clock, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
// @ts-ignore
import "highlight.js/styles/github.css";

// Calculate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Custom renderer to render headings as plain text (hashes shown)
function HeadingWithHash(props: any) {
  const { level, children } = props;
  const hashes = "#".repeat(level);
  // children is an array of React nodes, join as string for display
  return (
    <div>
      {hashes} {children}
    </div>
  );
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = useQuery(api.contact.getBlogPostBySlug, { slug: slug || "" });

  if (post === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-pink-600">Loading...</div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-pink-700 mb-4">
          Post Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          Sorry, we couldn't find that blog post.
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

  const readingTime = getReadingTime(post.content);

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

          <article className="prose prose-lg prose-pink max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ node, ...props }: any) => (
                  <HeadingWithHash level={1} {...props} />
                ),
                h2: ({ node, ...props }: any) => (
                  <HeadingWithHash level={2} {...props} />
                ),
                h3: ({ node, ...props }: any) => (
                  <HeadingWithHash level={3} {...props} />
                ),
                h4: ({ node, ...props }: any) => (
                  <HeadingWithHash level={4} {...props} />
                ),
                h5: ({ node, ...props }: any) => (
                  <HeadingWithHash level={5} {...props} />
                ),
                h6: ({ node, ...props }: any) => (
                  <HeadingWithHash level={6} {...props} />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </motion.div>
  );
}
