import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Profile | Aroosi",
  description:
    "View detailed profile on Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
  openGraph: {
    title: "View Profile | Aroosi",
    description:
      "View detailed profile on Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
    images: ["/logo.png"],
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "View Profile | Aroosi",
    description:
      "View detailed profile on Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
    images: ["/logo.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
