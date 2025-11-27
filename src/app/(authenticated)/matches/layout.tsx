import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Matches | Aroosi Afghan Matrimony",
  description:
    "View and connect with your matches on Aroosi. Chat with verified Afghan singles who match your preferences and cultural values.",
  keywords: [
    "matches aroosi",
    "afghan matches",
    "matrimonial matches",
    "chat matches",
    "afghan dating matches",
    "muslim marriage matches",
  ],
  openGraph: {
    title: "Your Matches | Aroosi Afghan Matrimony",
    description:
      "View and connect with your matches on Aroosi. Chat with verified Afghan singles who match your preferences.",
    images: ["https://aroosi.app/og-matches.png"],
    type: "website",
    url: "https://aroosi.app/matches",
    siteName: "Aroosi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Matches | Aroosi Afghan Matrimony",
    description:
      "View and connect with your matches on Aroosi. Chat with verified Afghan singles who match your preferences.",
    images: ["https://aroosi.app/og-matches.png"],
    site: "@aroosiapp",
    creator: "@aroosiapp",
  },
  alternates: {
    canonical: "https://aroosi.app/matches",
  },
  robots: {
    index: false,
    follow: false,
  },
  authors: [{ name: "Aroosi Team" }],
  other: {
    "geo.region": "GLOBAL",
    "geo.placename": "Worldwide",
    "geo.position": "0;0",
    ICBM: "0, 0",
  },
};

export default function MatchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
