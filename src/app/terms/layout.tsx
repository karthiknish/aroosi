import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Aroosi Afghan Matrimony",
  description:
    "Read the terms and conditions for using Aroosi's Afghan matrimony platform.",
  alternates: {
    canonical: "https://aroosi.app/terms",
  },
  openGraph: {
    type: "website",
    title: "Terms & Conditions | Aroosi Afghan Matrimony",
    description: "Rules and policies for using Aroosi services.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | Aroosi Afghan Matrimony",
    description: "Rules and policies for using Aroosi services.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
