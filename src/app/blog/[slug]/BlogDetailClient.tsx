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
    <article className="container mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1
          style={{
            lineHeight: 1.7,
          }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2"
        >
          {post.title}
        </h1>
        <div className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-3 items-center">
          <span>{date}</span>
          {readingTime && (
            <Badge variant="secondary" className="text-[11px] font-medium">
              {readingTime} min read
            </Badge>
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
            className="text-xs underline decoration-dotted text-primary hover:text-primary/80"
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
            className="text-xs underline decoration-dotted text-primary hover:text-primary/80"
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

      {post.imageUrl && /^https?:\/\//.test(post.imageUrl) ? (
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
      ) : post.imageUrl ? (
        <div className="w-full h-64 md:h-96 mb-6 overflow-hidden rounded-lg">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = "1";
                el.src = "/placeholder.jpg";
              }
            }}
          />
        </div>
      ) : null}

      {post.excerpt ? (
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          {post.excerpt}
        </p>
      ) : null}

      {post.content ? (
        <div
          id="blog-content"
          className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:leading-snug prose-h2:mt-10 prose-h3:mt-8 prose-p:leading-relaxed prose-p:my-4 prose-li:my-1.5 prose-ul:my-4 prose-ol:my-4 prose-img:my-6 prose-img:rounded-lg prose-a:text-primary hover:prose-a:text-primary/80 prose-blockquote:border-l-border prose-blockquote:pl-4 prose-blockquote:italic prose-hr:border-border prose-code:bg-muted prose-code:text-foreground prose-pre:bg-muted"
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
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Related Posts
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r._id}
                href={`/blog/${r.slug}`}
                className="group block p-4 rounded-lg border bg-card/80 hover:bg-card transition shadow-sm hover:shadow-md"
              >
                <h3 className="font-medium group-hover:text-primary line-clamp-2 mb-1 font-serif">
                  {r.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                  {r.excerpt}
                </p>
                <div className="text-xs text-muted-foreground">
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
