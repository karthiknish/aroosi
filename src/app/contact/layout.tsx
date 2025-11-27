import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - Aroosi | Get Support for Afghan Matrimony Platform",
  description:
    "Contact Aroosi support team for help with your Afghan matrimony account. Available 24/7 to assist with profile setup, membership questions, and technical support.",
  keywords:
    "aroosi contact, afghan matrimony support, customer service, help desk, matrimonial assistance, account support",
  alternates: {
    canonical: "https://aroosi.app/contact",
  },
  openGraph: {
    type: "website",
    url: "https://aroosi.app/contact",
    title: "Contact Us - Aroosi | Get Support for Afghan Matrimony Platform",
    description:
      "Contact Aroosi support team for help with your Afghan matrimony account. Available 24/7 to assist with profile setup and membership questions.",
    images: ["https://aroosi.app/og-contact.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us - Aroosi | Get Support for Afghan Matrimony Platform",
    description:
      "Contact Aroosi support team for help with your Afghan matrimony account. Available 24/7 to assist with profile setup and membership questions.",
    images: ["https://aroosi.app/og-contact.png"],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
