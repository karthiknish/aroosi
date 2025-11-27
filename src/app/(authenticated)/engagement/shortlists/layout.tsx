import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Shortlists | Aroosi",
  description: "View and manage your shortlisted profiles and personal notes on Aroosi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
