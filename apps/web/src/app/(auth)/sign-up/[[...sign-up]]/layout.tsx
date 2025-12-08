import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Aroosi Afghan Matrimony",
  description: "Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections with verified Afghan singles worldwide.",
  keywords: "signup aroosi, join afghan matrimony, create account, afghan dating, muslim marriage, halal dating, afghan singles, matrimonial registration",
  openGraph: {
    type: "website",
    url: "https://aroosi.app/sign-up",
    title: "Sign Up | Aroosi Afghan Matrimony",
    description: "Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections.",
    images: [
      {
        url: "https://aroosi.app/og-signup.png",
        width: 1200,
        height: 630,
        alt: "Join Aroosi - Afghan Matrimony Platform",
      },
    ],
    siteName: "Aroosi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up | Aroosi Afghan Matrimony",
    description: "Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections.",
    images: ["https://aroosi.app/og-signup.png"],
    site: "@aroosiapp",
    creator: "@aroosiapp",
  },
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://aroosi.app/sign-up",
  },
  other: {
    "geo.region": "GLOBAL",
    "geo.placename": "Worldwide",
    "geo.position": "0;0",
    "ICBM": "0, 0",
  },
};

export default function SignUpLayout({
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
            "@type": "WebPage",
            name: "Aroosi Sign Up",
            url: "https://aroosi.app/sign-up",
            description: "Sign up page for Aroosi Afghan matrimony platform",
            isPartOf: {
              "@type": "WebSite",
              name: "Aroosi",
              url: "https://aroosi.app",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
