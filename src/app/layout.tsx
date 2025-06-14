import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import ChatBot from "@/components/ChatBot";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RouteTransition from "@/components/RouteTransition";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aroosi - Afghan Matrimony Platform",
  description:
    "Find your perfect Afghan match with Aroosi, the trusted Afghan matrimony platform.",
  keywords:
    "matrimony, afghan matrimony, afghan marriage, aroosi, matrimonial site, rishta, afghan community, afghan singles, afghan wedding",
  openGraph: {
    title: "Aroosi - Afghan Matrimony Platform",
    description:
      "Find your ideal Afghan life partner with Aroosi. Secure, private, and community-focused matrimonial services for Afghans worldwide.",
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
      "Find your ideal Afghan life partner with Aroosi. Secure, private, and community-focused matrimonial services for Afghans worldwide.",
    images: ["/og-image.png"],
    site: "@aroosiuk",
  },
};

// Define client-side only components
function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      <main className="pt-12 min-h-[calc(100vh-theme(spacing.24)-theme(spacing.12))] overflow-x-hidden">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <Footer />
      <Toaster position="bottom-right" />
      <ChatBot />
    </AuthProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Boldonse:wght@400;700&family=Nunito+Sans:wght@400;600;700&family=Open+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkProvider
          appearance={{
            layout: {
              socialButtonsVariant: "iconButton",
              logoImageUrl: "/logo.png",
              logoPlacement: "inside",
              showOptionalFields: false,
              privacyPageUrl: "/privacy",
              termsPageUrl: "/terms",
            },
            variables: {
              colorPrimary: "#BFA67A",
              colorText: "#000000",
              colorBackground: "#ffffff",
              colorInputBackground: "#f9fafb",
              colorInputText: "#000000",
              colorTextSecondary: "#BFA67A",
              colorTextOnPrimaryBackground: "#ffffff",
              colorDanger: "#d90012",
              colorSuccess: "#BFA67A",
              colorWarning: "#f59e0b",
              borderRadius: "0.5rem",
              fontFamily: "'Open Sans', Arial, sans-serif",
            },
            elements: {
              formButtonPrimary: {
                backgroundColor: "#BFA67A",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#a68d54",
                },
              },
              card: {
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                borderRadius: "1rem",
                border: "1.5px solid #BFA67A",
              },
              headerTitle: {
                fontFamily: "'Boldonse', serif",
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#d90012",
              },
              headerSubtitle: {
                fontFamily: "'Open Sans', Arial, sans-serif",
                fontSize: "1rem",
                color: "#BFA67A",
              },
              socialButtonsBlockButton: {
                border: "1px solid #e5e7eb",
                "&:hover": {
                  backgroundColor: "#f9fafb",
                },
              },
              formFieldInput: {
                border: "1px solid #e5e7eb",
                "&:focus": {
                  borderColor: "#BFA67A",
                  boxShadow: "0 0 0 1px #BFA67A",
                },
              },
              formFieldLabel: {
                color: "#000000",
                fontSize: "0.875rem",
                fontFamily: "'Open Sans', Arial, sans-serif",
              },
              formFieldInputShowPasswordButton: {
                color: "#BFA67A",
                "&:hover": {
                  color: "#d90012",
                },
              },
              footerActionLink: {
                color: "#BFA67A",
                "&:hover": {
                  color: "#d90012",
                },
              },
            },
          }}
        >
          <ReactQueryProvider>
            <ClientLayout>{children}</ClientLayout>
          </ReactQueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
