import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage Analytics | Aroosi",
  description: "Track your activity and usage statistics on Aroosi.",
};

export default function UsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
