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
  categories?: string[];
  content?: string;
}

// Pre-generate the most recent slugs (ISR) to improve initial load & SEO
export async function generateStaticParams() {
  try {
    const snap = await db
      .collection("blogPosts")
      .orderBy("createdAt", "desc")
      .limit(25)
      .get();

    const slugs = snap.docs
      .map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = d.data() as BlogMetaDoc;
        return data.slug;
      })
      .filter((slug: string | undefined): slug is string => Boolean(slug));

   

    return slugs.map((slugStr: string) => ({ slug: slugStr }));
  } catch (error) {
    console.error("[generateStaticParams] Error fetching blog posts:", error);
    return [];
  }
}

// Revalidate each post every 10 minutes
export const revalidate = 600; // seconds

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  let post: BlogMetaDoc | null = null;
  try {
    // Prefer sanitized slug
    const sanitized = sanitizeBlogSlug(slug);
    console.log(`[generateMetadata] Looking for blog post with slug: "${slug}" (sanitized: "${sanitized}")`);

    const col = db.collection("blogPosts");
    let snap = await col.where("slug", "==", sanitized).limit(1).get();
    console.log(`[generateMetadata] Query 1 (sanitized slug) found ${snap.size} results`);

    if (snap.empty) {
      // Try exact raw key
      snap = await col.where("slug", "==", slug).limit(1).get();
      console.log(`[generateMetadata] Query 2 (exact slug) found ${snap.size} results`);
    }
    if (snap.empty) {
      // Try lowercased raw key
      snap = await col.where("slug", "==", slug.toLowerCase()).limit(1).get();
      console.log(`[generateMetadata] Query 3 (lowercased slug) found ${snap.size} results`);
    }
    if (!snap.empty) {
      const d = snap.docs[0];
      post = d.data() as BlogMetaDoc;
      console.log(`[generateMetadata] Found post:`, { id: d.id, title: post.title, slug: post.slug });
    } else {
      console.log(`[generateMetadata] No blog post found for slug: "${slug}"`);
    }
  } catch (error) {
    console.error(`[generateMetadata] Error fetching blog post for slug "${slug}":`, error);
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

export default async function BlogDetailPageWrapper(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return <BlogDetailClient slug={slug} />;
}
