import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Plans | Aroosi",
  description: "Choose the perfect subscription plan for your journey on Aroosi.",
};

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
