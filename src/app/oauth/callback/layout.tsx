import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authenticating | Aroosi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
