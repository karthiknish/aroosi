import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blocked Users | Aroosi",
  description: "Manage your blocked users list on Aroosi.",
};

export default function BlockedUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
