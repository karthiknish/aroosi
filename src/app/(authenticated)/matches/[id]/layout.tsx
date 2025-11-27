import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat — Aroosi Matches",
  robots: {
    index: false,
    follow: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  themeColor: "#bfa67a",
};

export default function MatchChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
