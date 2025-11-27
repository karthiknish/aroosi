import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions",
  description:
    "Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials. Unlimited messaging, advanced features, and more.",
  keywords: [
    "aroosi pricing",
    "afghan matrimony cost",
    "matrimonial subscription",
    "premium membership",
    "muslim dating plans",
    "halal matrimony pricing",
  ],
  openGraph: {
    type: "website",
    url: "https://aroosi.app/pricing",
    title: "Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions",
    description:
      "Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials.",
    images: ["https://aroosi.app/og-pricing.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions",
    description:
      "Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials.",
    images: ["https://aroosi.app/og-pricing.png"],
  },
  alternates: {
    canonical: "https://aroosi.app/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
