import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Aroosi",
  description:
    "Read the privacy policy for Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
  openGraph: {
    title: "Privacy Policy | Aroosi",
    description:
      "Read the privacy policy for Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
    images: ["/og-image.png"],
    url: "https://aroosi.app/privacy",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Aroosi",
    description:
      "Read the privacy policy for Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.",
    images: ["/og-image.png"],
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
