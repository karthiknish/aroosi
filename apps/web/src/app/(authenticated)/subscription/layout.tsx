import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription | Aroosi",
  description: "Manage your Aroosi subscription, upgrade plans, and view billing details.",
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
