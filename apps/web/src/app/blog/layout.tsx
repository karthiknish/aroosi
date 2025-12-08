import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Aroosi | Afghan Matrimony Stories, Advice & Cultural Insights",
  description: "Discover inspiring Afghan matrimony stories, expert marriage advice, and cultural insights. Get guidance for your journey to finding the perfect Afghan life partner through Aroosi.",
  keywords: "afghan blog, matrimony advice, afghan marriage stories, cultural insights, relationship guidance, afghan wedding traditions, aroosi blog",
  openGraph: {
    title: "Blog - Aroosi | Afghan Matrimony Stories & Advice",
    description: "Read inspiring Afghan matrimony stories, expert advice, and cultural insights to guide your journey towards finding your perfect life partner.",
    url: "https://aroosi.app/blog",
    type: "website",
    images: [
      {
        url: "https://aroosi.app/og-blog.png",
        width: 1200,
        height: 630,
        alt: "Aroosi Blog - Afghan Matrimony Stories and Advice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Aroosi | Afghan Matrimony Stories & Advice",
    description: "Read inspiring Afghan matrimony stories, expert advice, and cultural insights to guide your journey towards finding your perfect life partner.",
    images: ["https://aroosi.app/og-blog.png"],
  },
  alternates: {
    canonical: "https://aroosi.app/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Aroosi Blog",
            description:
              "Afghan matrimony advice, stories, and cultural insights for singles seeking their perfect life partner",
            url: "https://aroosi.app/blog",
            publisher: {
              "@type": "Organization",
              name: "Aroosi",
              url: "https://aroosi.app",
              logo: {
                "@type": "ImageObject",
                url: "https://aroosi.app/logo.png",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": "https://aroosi.app/blog",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
