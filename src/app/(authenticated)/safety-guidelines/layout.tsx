import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Guidelines | Aroosi",
  description: "Read our safety guidelines to ensure a secure and respectful experience on Aroosi.",
};

export default function SafetyGuidelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
