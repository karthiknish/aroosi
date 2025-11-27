import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | Aroosi",
  description:
    "View and manage your Aroosi profile, photos, and account settings.",
  openGraph: {
    title: "My Profile | Aroosi",
    description:
      "View and manage your Aroosi profile, photos, and account settings.",
    images: ["/logo.png"],
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Profile | Aroosi",
    description:
      "View and manage your Aroosi profile, photos, and account settings.",
    images: ["/logo.png"],
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
