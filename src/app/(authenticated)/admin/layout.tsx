"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, isAdmin } = useAuthContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in or not admin, show nothing (will be redirected)
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentPath={pathname}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          currentPath={pathname}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}