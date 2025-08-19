"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { BlogPost } from "@/types/blog";
import { fetchBlogPostBySlug } from "@/lib/blogUtil";

export default function BlogDetailClient({ slug }: { slug: string }) {
  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery<BlogPost | null>({
    queryKey: ["blogPost", slug],
    queryFn: () => fetchBlogPostBySlug(slug),
  });

  const firstCategory = post?.categories?.[0];
  const { data: related = [] } = useQuery<BlogPost[]>({
    queryKey: ["relatedPosts", firstCategory, slug],
    queryFn: async () => {
      if (!firstCategory) return [];
      try {
        const params = new URLSearchParams({
          page: "0",
          pageSize: "6",
          category: firstCategory,
        });
        const res = await fetch(`/api/blog?${params.toString()}`);
        if (!res.ok) return [];
        const json = await res.json();
        const payload = json?.data || json;
        const posts: BlogPost[] = (payload.posts || payload || []).filter(
          (p: BlogPost) => p.slug !== slug
        );
        return posts.slice(0, 3);
      } catch {
        return [];
      }
    },
    enabled: !!firstCategory,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-8 w-2/3 mb-4" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load the blog post."
        onRetry={() => refetch()}
        className="min-h-[50vh]"
      />
    );
  }

  if (!post) {
    return (
      <EmptyState
        message="Post not found"
        description="The blog post you're looking for doesn't exist or was removed."
        className="min-h-[50vh]"
      />
    );
  }

  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  // Estimate reading time (rough: 200 wpm)
  const readingTime = post.content
    ? Math.max(
        1,
        Math.round(
          post.content.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200
        )
      )
    : null;

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{post.title}</h1>
        <div className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-3 items-center">
          <span>{date}</span>
          {readingTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-xs border border-pink-200">
              {readingTime} min read
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              try {
                navigator.share?.({
                  title: post.title,
                  text: post.excerpt,
                  url:
                    typeof window !== "undefined"
                      ? window.location.href
                      : undefined,
                });
              } catch {}
            }}
            className="text-xs underline decoration-dotted text-pink-600 hover:text-pink-700"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard.writeText(window.location.href);
              } catch {}
            }}
            className="text-xs underline decoration-dotted text-pink-600 hover:text-pink-700"
          >
            Copy Link
          </button>
        </div>
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.categories.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {post.imageUrl ? (
        <div className="relative w-full h-64 md:h-96 mb-6 overflow-hidden rounded-lg">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      ) : null}

      {post.excerpt ? (
        <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>
      ) : null}

      {post.content ? (
        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : null}

      {/* Structured Data (JSON-LD) for the Blog Posting */}
      <script
        type="application/ld+json"
        // Use post fields; fall back gracefully if missing
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: post.imageUrl || undefined,
            datePublished: post.createdAt
              ? new Date(post.createdAt).toISOString()
              : undefined,
            dateModified: post.updatedAt
              ? new Date(post.updatedAt).toISOString()
              : undefined,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id":
                typeof window !== "undefined"
                  ? window.location.href
                  : undefined,
            },
            url:
              typeof window !== "undefined" ? window.location.href : undefined,
            author: { "@type": "Organization", name: "Aroosi" },
            publisher: {
              "@type": "Organization",
              name: "Aroosi",
              logo: {
                "@type": "ImageObject",
                url: "https://aroosi.app/logo.png",
              },
            },
          }),
        }}
      />

      {related.length > 0 && (
        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Related Posts</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r._id}
                href={`/blog/${r.slug}`}
                className="group block p-4 rounded-lg border bg-white/70 hover:bg-white transition shadow-sm hover:shadow-md"
              >
                <h3 className="font-medium group-hover:text-pink-600 line-clamp-2 mb-1 font-serif">
                  {r.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                  {r.excerpt}
                </p>
                <div className="text-xs text-gray-500">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
                    : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
