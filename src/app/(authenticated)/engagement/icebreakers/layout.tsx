import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icebreakers | Aroosi",
  description: "Answer icebreaker questions to help your profile stand out and attract more meaningful connections on Aroosi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
