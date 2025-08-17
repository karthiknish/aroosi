import { db } from "@/lib/firebaseAdmin";
import { sanitizeBlogSlug } from "@/lib/blogSanitize";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  // Prefer real post data for accurate metadata; fall back to slug-derived values
  const slug = params.slug;
  let post: { title?: string; excerpt?: string; imageUrl?: string } | null =
    null;
  try {
    const snap = await db
      .collection("blogPosts")
      .where("slug", "==", sanitizeBlogSlug(slug))
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      post = d.data() as any;
    }
  } catch {
    // ignore
  }

  const title = post?.title
    ? `${post.title} | Aroosi Blog`
    : `Aroosi Blog | ${slug.replace(/-/g, " ")}`;
  const description = post?.excerpt || "Read this story on Aroosi's blog.";
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

export default function BlogDetailPageWrapper({
  params,
}: {
  params: { slug: string };
}) {
  return <BlogDetailClient slug={params.slug} />;
}
