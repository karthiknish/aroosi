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
              colorPrimary: "#d90012",
              colorText: "#000000",
              colorBackground: "#ffffff",
              colorInputBackground: "#f9fafb",
              colorInputText: "#000000",
              colorTextSecondary: "#1eb53a",
              colorTextOnPrimaryBackground: "#ffffff",
              colorDanger: "#d90012",
              colorSuccess: "#1eb53a",
              colorWarning: "#f59e0b",
              borderRadius: "0.5rem",
              fontFamily: "'Open Sans', Arial, sans-serif",
            },
            elements: {
              formButtonPrimary: {
                backgroundColor: "#d90012",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#b8000b",
                },
              },
              card: {
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                borderRadius: "1rem",
                border: "1.5px solid #1eb53a",
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
                color: "#1eb53a",
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
                  borderColor: "#d90012",
                  boxShadow: "0 0 0 1px #d90012",
                },
              },
              formFieldLabel: {
                color: "#000000",
                fontSize: "0.875rem",
                fontFamily: "'Open Sans', Arial, sans-serif",
              },
              formFieldInputShowPasswordButton: {
                color: "#1eb53a",
                "&:hover": {
                  color: "#d90012",
                },
              },
              footerActionLink: {
                color: "#1eb53a",
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
