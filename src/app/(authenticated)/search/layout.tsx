import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Profiles | Aroosi Afghan Matrimony",
  description: "Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters for location, age, education, and cultural preferences.",
  keywords: "search profiles aroosi, afghan profiles search, matrimonial search, find matches, afghan singles search, muslim dating search",
  openGraph: {
    type: "website",
    url: "https://aroosi.app/search",
    title: "Search Profiles | Aroosi Afghan Matrimony",
    description: "Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters.",
    images: [
      {
        url: "https://aroosi.app/og-search.png",
        width: 1200,
        height: 630,
        alt: "Search Afghan Profiles on Aroosi",
      },
    ],
    siteName: "Aroosi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Search Profiles | Aroosi Afghan Matrimony",
    description: "Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters.",
    images: ["https://aroosi.app/og-search.png"],
    site: "@aroosiapp",
    creator: "@aroosiapp",
  },
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://aroosi.app/search",
  },
  other: {
    "geo.region": "GLOBAL",
    "geo.placename": "Worldwide",
    "geo.position": "0;0",
    "ICBM": "0, 0",
  },
};

export default function SearchLayout({
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
            "@type": "WebPage",
            name: "Search Profiles",
            url: "https://aroosi.app/search",
            description:
              "Search for compatible Afghan singles on Aroosi matrimony platform",
            isPartOf: {
              "@type": "WebSite",
              name: "Aroosi",
              url: "https://aroosi.app",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
