import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Aroosi Works | Find Your Afghan Match",
  description:
    "Learn how Aroosi helps Afghans find trusted matches with safety and privacy at heart.",
  openGraph: {
    title: "How Aroosi Works | Find Your Afghan Match",
    description: "Steps to create your profile, match, and connect on Aroosi.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Aroosi Works | Find Your Afghan Match",
    description: "Steps to create your profile, match, and connect on Aroosi.",
  },
  alternates: {
    canonical: "https://aroosi.app/how-it-works",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
