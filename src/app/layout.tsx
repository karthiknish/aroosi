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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aroosi - Find Your Perfect Match",
  description: "Find your perfect match with Aroosi",
  keywords:
    "matrimony, muslim matrimony, uk muslim, marriage, islamic marriage, aroosi, matrimonial site, rishta, uk rishta",
  openGraph: {
    title: "Aroosi - UK Matrimony for Muslims",
    description:
      "Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services.",
    url: "https://aroosi.co.uk/",
    siteName: "Aroosi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aroosi - UK Matrimony for Muslims",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aroosi - UK Matrimony for Muslims",
    description:
      "Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services.",
    images: ["/og-image.png"],
    site: "@aroosiuk",
  },
};

// Define client-side only components
function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      <main className="min-h-screen">{children}</main>
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
          href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Nunito+Sans:wght@400;600;700&display=swap"
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
              colorPrimary: "#ec4899",
              colorText: "#1f2937",
              colorBackground: "#ffffff",
              colorInputBackground: "#f9fafb",
              colorInputText: "#1f2937",
              colorTextSecondary: "#6b7280",
              colorTextOnPrimaryBackground: "#ffffff",
              colorDanger: "#ef4444",
              colorSuccess: "#22c55e",
              colorWarning: "#f59e0b",
              borderRadius: "0.5rem",
              fontFamily: inter.style.fontFamily,
            },
            elements: {
              formButtonPrimary: {
                backgroundColor: "#ec4899",
                "&:hover": {
                  backgroundColor: "#db2777",
                },
              },
              card: {
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                borderRadius: "1rem",
              },
              headerTitle: {
                fontSize: "1.5rem",
                fontWeight: "600",
              },
              headerSubtitle: {
                fontSize: "1rem",
                color: "#6b7280",
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
                  borderColor: "#ec4899",
                  boxShadow: "0 0 0 1px #ec4899",
                },
              },
              formFieldLabel: {
                color: "#4b5563",
                fontSize: "0.875rem",
              },
              formFieldInputShowPasswordButton: {
                color: "#6b7280",
                "&:hover": {
                  color: "#4b5563",
                },
              },
              footerActionLink: {
                color: "#ec4899",
                "&:hover": {
                  color: "#db2777",
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
