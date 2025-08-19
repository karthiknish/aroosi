import { db } from "@/lib/firebaseAdmin";
import { sanitizeBlogSlug } from "@/lib/blogSanitize";
import BlogDetailClient from "@/app/blog/[slug]/BlogDetailClient";
import type { Metadata } from "next";

interface BlogMetaDoc {
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  createdAt?: number;
  updatedAt?: number;
  slug?: string;
}

// Pre-generate the most recent slugs (ISR) to improve initial load & SEO
export async function generateStaticParams() {
  try {
    const snap = await db
      .collection("blogPosts")
      .orderBy("createdAt", "desc")
      .limit(25)
      .get();
    return snap.docs
      .map(
        (d: FirebaseFirestore.QueryDocumentSnapshot): string | undefined =>
          (d.data() as BlogMetaDoc).slug
      )
      .filter((s: string | undefined): s is string => Boolean(s))
      .map((slugStr: string) => ({ slug: slugStr }));
  } catch {
    return [];
  }
}

// Revalidate each post every 10 minutes
export const revalidate = 600; // seconds

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // Prefer real post data for accurate metadata; fall back to slug-derived values
  const slug = params.slug;
  let post: BlogMetaDoc | null = null;
  try {
    const snap = await db
      .collection("blogPosts")
      .where("slug", "==", sanitizeBlogSlug(slug))
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      post = d.data() as BlogMetaDoc;
    }
  } catch {
    // ignore
  }

  const title = post?.title
    ? `${post.title} | Aroosi Blog`
    : `Aroosi Blog | ${slug.replace(/-/g, " ")}`;
  const description = post?.excerpt || "Read this story on Aroosi's blog.";
  const images = post?.imageUrl ? [{ url: post.imageUrl }] : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post?.title || slug.replace(/-/g, " "),
    description,
    image: images?.[0]?.url,
    datePublished: post?.createdAt
      ? new Date(post.createdAt).toISOString()
      : undefined,
    dateModified: post?.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://aroosi.app/blog/${slug}`,
    },
    url: `https://aroosi.app/blog/${slug}`,
    author: { "@type": "Organization", name: "Aroosi" },
    publisher: {
      "@type": "Organization",
      name: "Aroosi",
      logo: { "@type": "ImageObject", url: "https://aroosi.app/logo.png" },
    },
  };

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
    other: {
      // Expose JSON-LD so that it can be rendered where metadata is applied (Next will render <meta> tags only; JSON-LD script we inject in component below if needed)
      // We pass stringified schema to client component through data attribute as fallback.
      "data-jsonld": JSON.stringify(jsonLd),
    },
  };
}

export default function BlogDetailPageWrapper({
  params,
}: {
  params: { slug: string };
}) {
  return <BlogDetailClient slug={params.slug} />;
}
