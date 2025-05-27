import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import { Toaster } from "sonner";
import MainLayoutContent from "@/components/layout/MainLayoutContent";
import ChatBot from "@/components/ChatBot";

export const metadata: Metadata = {
  title: "Aroosi - UK Matrimony for Muslims",
  description:
    "Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        layout: {
          showOptionalFields: true,
          socialButtonsVariant: "iconButton",
          logoPlacement: "none", // This hides the Clerk logo
        },
        variables: {
          colorPrimary: "#E11D48", // Aroosi Pink (rose-600)
          colorText: "#1F2937", // Tailwind gray-800
          colorBackground: "#FFFFFF", // Card background
          colorInputBackground: "#F9FAFB", // Tailwind gray-50
          colorInputText: "#1F2937",
          fontFamily: "Nunito Sans, Arial, sans-serif",
          borderRadius: "0.5rem", // shadcn/ui default (lg)
        },
        // elements: { // For more granular control if layout.logoPlacement doesn't work
        //   logoBox: { display: "none" },
        //   card: { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }
        // }
      }}
    >
      <html lang="en">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Nunito+Sans:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className={`font-sans antialiased`}>
          <ProfileCompletionGuard>
            <MainLayoutContent>{children}</MainLayoutContent>
          </ProfileCompletionGuard>
          <Toaster richColors />
          <ChatBot />
        </body>
      </html>
    </ClerkProvider>
  );
}
