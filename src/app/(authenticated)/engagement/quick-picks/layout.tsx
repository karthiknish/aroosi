import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Picks | Aroosi",
  description: "Discover your daily curated matches with Quick Picks on Aroosi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
