import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium Settings | Aroosi",
  description: "Manage your premium features and privacy settings on Aroosi.",
};

export default function PremiumSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
