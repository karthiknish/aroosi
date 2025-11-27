import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Aroosi",
  description:
    "Reset your Aroosi account password securely. Enter your email and reset code to set a new password.",
  openGraph: {
    title: "Reset Password | Aroosi",
    description:
      "Reset your Aroosi account password securely. Enter your email and reset code to set a new password.",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset Password | Aroosi",
    description:
      "Reset your Aroosi account password securely. Enter your email and reset code to set a new password.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://aroosi.app/reset-password",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
