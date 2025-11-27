import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Aroosi | Afghan Matrimony",
  description:
    "Learn about Aroosi's mission to connect Afghans worldwide with a safe, private, and trusted matrimony platform.",
  alternates: {
    canonical: "https://aroosi.app/about",
  },
  openGraph: {
    type: "website",
    title: "About Aroosi | Afghan Matrimony",
    description:
      "Our mission and values: safety, privacy, and meaningful connections for Afghans worldwide.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Aroosi | Afghan Matrimony",
    description:
      "Our mission and values: safety, privacy, and meaningful connections for Afghans worldwide.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
