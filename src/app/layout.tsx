import type { Metadata } from "next";
import "./globals.css";

import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { AuthProvider } from "@/components/AuthProvider";
import ClientRoot from "@/components/ClientRoot";
import Script from "next/script";

export const viewport = "width=device-width, initial-scale=1";

export const metadata: Metadata = {
  title: "Aroosi - Afghan Matrimony Platform",
  description:
    "No 1 Afghan matrimony site. Find your perfect Afghan match with Aroosi, the trusted Afghan matrimony platform.",
  keywords:
    "matrimony, afghan matrimony, afghan marriage, aroosi, matrimonial site, rishta, afghan community, afghan singles, afghan wedding",
  robots: "index, follow",
  authors: [{ name: "Aroosi Team" }],
  openGraph: {
    title: "Aroosi - Afghan Matrimony Platform",
    description:
      "No 1 Afghan matrimony site. Find your ideal Afghan life partner with Aroosi. Secure, private, and community-focused matrimonial services for Afghans worldwide.",
    url: "https://aroosi.co.uk/",
    siteName: "Aroosi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aroosi - Afghan Matrimony Platform",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aroosi - Afghan Matrimony Platform",
    description:
      "No 1 Afghan matrimony site. Find your ideal Afghan life partner with Aroosi. Secure, private, and community-focused matrimonial services for Afghans worldwide.",
    images: ["/og-image.png"],
    site: "@aroosiuk",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#EC4899" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="language" content="en" />
        <meta name="author" content="Aroosi Team" />
        <meta name="copyright" content="© 2024 Aroosi. All rights reserved." />
        <meta name="rating" content="General" />
        <meta name="distribution" content="global" />
        <meta name="revisit-after" content="1 days" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta
          httpEquiv="Referrer-Policy"
          content="strict-origin-when-cross-origin"
        />

        {/* Canonical URL */}
        <link rel="canonical" href="https://aroosi.app" />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/android-chrome-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/android-chrome-512x512.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Boldonse:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap"
          rel="stylesheet"
        />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://cdn.onesignal.com" />

        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="https://aroosi.app" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Meta Description for SEO */}
        <meta
          name="description"
          content="No 1 Afghan matrimony site. Find your perfect Afghan match with Aroosi, the trusted Afghan matrimony platform."
        />
      </head>
      <body suppressHydrationWarning>
        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed -top-10 left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:border focus:border-gray-300 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <ReactQueryProvider>
          <AuthProvider>
            <ClientRoot>{children}</ClientRoot>
          </AuthProvider>
        </ReactQueryProvider>

        {/* OneSignal SDK v16 */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(function(OneSignal) {
              OneSignal.init({
                appId: "${process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID}",
                safari_web_id: "${process.env.NEXT_PUBLIC_ONE_SIGNAL_SAFARI_ID}",
                notifyButton: { enable: true }
              });
            });
          `}
        </Script>
      </body>
    </html>
  );
}
