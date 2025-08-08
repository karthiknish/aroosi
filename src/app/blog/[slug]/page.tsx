import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // Prefer real post data for accurate metadata; fall back to slug-derived values
  const slug = params.slug;
  let post: { title?: string; excerpt?: string; imageUrl?: string } | null = null;
  try {
    post = await fetchQuery(api.blog.getBlogPostBySlug, { slug });
  } catch {
    // ignore and use fallback
  }

  const title = post?.title
    ? `${post.title} | Aroosi Blog`
    : `Aroosi Blog | ${slug.replace(/-/g, " ")}`;
  const description =
    post?.excerpt || "Read this story on Aroosi's blog.";
  const images = post?.imageUrl ? [{ url: post.imageUrl }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title, description, type: "article", images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  } as const;
}

import BlogDetailClient from "@/app/blog/[slug]/BlogDetailClient";

export default function BlogDetailPageWrapper({ params }: { params: { slug: string } }) {
  return <BlogDetailClient slug={params.slug} />;
}
