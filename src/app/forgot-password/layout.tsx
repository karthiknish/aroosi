import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Aroosi",
  description: "Reset your Aroosi account password. Enter your email to receive a password reset link.",
  openGraph: {
    title: "Forgot Password | Aroosi",
    description: "Reset your Aroosi account password. Enter your email to receive a password reset link.",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgot Password | Aroosi",
    description: "Reset your Aroosi account password. Enter your email to receive a password reset link.",
    images: ["/logo.png"],
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
