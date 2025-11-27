import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony",
  description: "Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, profile verification, matching system, and more.",
  keywords: "aroosi faq, afghan matrimony questions, membership help, profile setup, matching system, safety guidelines, subscription plans",
  openGraph: {
    type: "website",
    url: "https://aroosi.app/faq",
    title: "FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony",
    description: "Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, and matching system.",
    images: ["https://aroosi.app/og-faq.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony",
    description: "Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, and matching system.",
    images: ["https://aroosi.app/og-faq.png"],
  },
  alternates: {
    canonical: "https://aroosi.app/faq",
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is Aroosi?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Aroosi is a premium matrimony platform specifically designed for the Afghan community. We provide a safe, secure, and culturally sensitive environment for Afghan singles to find their life partners.",
                },
              },
              {
                "@type": "Question",
                name: "Is Aroosi free to use?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes! Aroosi offers a Free plan that includes creating a profile, limited daily searches, and viewing profiles. For unlimited messaging and premium features, we offer Premium (£14.99/month) and Premium Plus (£39.99/month) plans.",
                },
              },
              {
                "@type": "Question",
                name: "How do you ensure user safety?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "We implement multiple safety layers: profile verification, photo authentication, content moderation, secure messaging, and the ability to block/report users. All profiles are reviewed before approval.",
                },
              },
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
