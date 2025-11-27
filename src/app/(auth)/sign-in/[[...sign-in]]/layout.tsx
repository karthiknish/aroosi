import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Aroosi Afghan Matrimony",
  description:
    "Sign in to your Aroosi account to find your perfect Afghan match. Access your profile, matches, messages, and premium features securely.",
  keywords: [
    "signin aroosi",
    "login afghan matrimony",
    "aroosi account",
    "matrimonial login",
    "afghan dating login",
    "muslim marriage login",
  ],
  openGraph: {
    type: "website",
    url: "https://aroosi.app/sign-in",
    title: "Sign In | Aroosi Afghan Matrimony",
    description:
      "Sign in to your Aroosi account to find your perfect Afghan match. Access your profile, matches, and premium features.",
    images: [
      {
        url: "https://aroosi.app/og-signin.png",
        width: 1200,
        height: 630,
        alt: "Sign In to Aroosi - Afghan Matrimony",
      },
    ],
    siteName: "Aroosi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@aroosiapp",
    creator: "@aroosiapp",
    title: "Sign In | Aroosi Afghan Matrimony",
    description:
      "Sign in to your Aroosi account to find your perfect Afghan match. Access your profile and premium features.",
    images: ["https://aroosi.app/og-signin.png"],
  },
  alternates: {
    canonical: "https://aroosi.app/sign-in",
  },
  robots: {
    index: false,
    follow: true,
  },
  authors: [{ name: "Aroosi Team" }],
  other: {
    "geo.region": "GLOBAL",
    "geo.placename": "Worldwide",
    "geo.position": "0;0",
    ICBM: "0, 0",
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
