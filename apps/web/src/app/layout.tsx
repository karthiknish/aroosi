import "./globals.css";
import "@/lib/safari-polyfills";

import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { UserProfileProvider } from "@/components/UserProfileProvider";
import ClientRoot from "@/components/ClientRoot";
import Script from "next/script";
import RouteTransition from "@/components/RouteTransition";
import RouteLoader from "@/components/RouteLoader";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EC4899",
};

export const metadata: Metadata = {
  title: {
    default: "Aroosi - Number 1 Afghan Matrimony Site",
    template: "%s | Aroosi",
  },
  description:
    "Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service trusted by the global Afghan community.",
  keywords: [
    "afghan matrimony",
    "afghan marriage",
    "afghan singles",
    "matrimonial site",
    "aroosi",
    "rishta",
    "afghan community",
    "afghan wedding",
    "muslim matrimony",
    "halal dating",
  ],
  authors: [{ name: "Aroosi Team" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    url: "https://aroosi.app/",
    title: "Aroosi - Afghan Matrimony Platform | Connecting Afghans Worldwide",
    description:
      "Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service.",
    siteName: "Aroosi",
    locale: "en_US",
    images: [
      {
        url: "https://aroosi.app/og-home.png",
        width: 1200,
        height: 630,
        alt: "Aroosi - Afghan Matrimony Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@aroosiapp",
    creator: "@aroosiapp",
    title: "Aroosi - Afghan Matrimony Platform | Connecting Afghans Worldwide",
    description:
      "Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service.",
    images: ["https://aroosi.app/og-home.png"],
  },
  alternates: {
    canonical: "https://aroosi.app",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "geo.region": "GLOBAL",
    "geo.placename": "Worldwide",
    "geo.position": "0;0",
    ICBM: "0, 0",
    copyright: "© 2024 Aroosi. All rights reserved.",
    rating: "General",
    distribution: "global",
    "revisit-after": "1 days",
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
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta
          httpEquiv="Referrer-Policy"
          content="strict-origin-when-cross-origin"
        />

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
      </head>
      <body suppressHydrationWarning>
        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed -top-10 left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-base-light focus:text-neutral-dark focus:border focus:border-neutral/20 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <ReactQueryProvider>
          <UserProfileProvider>
            <ClientRoot>
              <RouteLoader />
              <RouteTransition>{children}</RouteTransition>
            </ClientRoot>
          </UserProfileProvider>
        </ReactQueryProvider>

        {/* Google Analytics (GA4) */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        ) : null}

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
