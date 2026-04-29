import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "admin") {
      redirect("/search");
    }
  } catch {
    redirect("/search");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
