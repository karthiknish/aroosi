"use client";

import { useQuery } from "@tanstack/react-query";
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

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{post.title}</h1>
        <div className="text-sm text-muted-foreground mb-4">{date}</div>
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
          // Content is sanitized on write via Convex backend
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : null}
    </article>
  );
}
