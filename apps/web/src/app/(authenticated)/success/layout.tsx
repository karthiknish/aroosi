import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Aroosi!",
  description: "Your profile has been successfully created. Welcome to the Aroosi community!",
};

export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
