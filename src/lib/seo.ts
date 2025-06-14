// New file with SEO helper utilities
import type { Metadata } from "next";

// Default metadata extracted from the root layout
const defaultTitle = "Aroosi - Afghan Matrimony Platform";
const defaultDescription =
  "Find your perfect Afghan match with Aroosi, the trusted Afghan matrimony platform.";

const defaultKeywords = [
  "matrimony",
  "afghan matrimony",
  "afghan marriage",
  "aroosi",
  "matrimonial site",
  "rishta",
  "afghan community",
  "afghan singles",
  "afghan wedding",
];

const defaultOgImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: defaultTitle,
};

const defaultOpenGraph = {
  title: defaultTitle,
  description: defaultDescription,
  url: "https://aroosi.co.uk/",
  siteName: "Aroosi",
  images: [defaultOgImage],
  locale: "en_GB",
  type: "website",
};

const defaultTwitter = {
  card: "summary_large_image",
  title: defaultTitle,
  description: defaultDescription,
  images: ["/og-image.png"],
  site: "@aroosiuk",
};

interface MetaOverrides {
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: Partial<Metadata["openGraph"]>;
  twitter?: Partial<Metadata["twitter"]>;
}

export function buildMetadata(overrides: MetaOverrides = {}): Metadata {
  const title = overrides.title ?? defaultTitle;
  const description = overrides.description ?? defaultDescription;
  const keywords = overrides.keywords ?? defaultKeywords;

  const openGraph = {
    ...defaultOpenGraph,
    ...overrides.openGraph,
    title,
    description,
  };

  const twitter = {
    ...defaultTwitter,
    ...overrides.twitter,
    title,
    description,
  };

  return {
    title,
    description,
    keywords,
    openGraph,
    twitter,
  } as Metadata;
}
