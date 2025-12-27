"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, isAdmin } = useAuthContext();
  // Default to collapsed (mobile-first approach) to avoid flash of open sidebar on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Adjust sidebar state based on screen width on mount
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false);
      }
    };

    // Check immediately
    handleResize();

    // Optional: Add listener if we want dynamic resizing behavior
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/search");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral/5">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in or not admin, show nothing (will be redirected)
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={!sidebarCollapsed}>
      <div className="min-h-screen bg-neutral/5 flex w-full">
        {/* Sidebar */}
        <AdminSidebar currentPath={pathname} />
        
        {/* Main Content Area */}
        <SidebarInset className="flex-1 flex flex-col overflow-hidden relative">
          {/* Mobile Floating Trigger */}
          <div className="md:hidden fixed top-4 left-4 z-50">
            <SidebarTrigger className="bg-base-light shadow-md border border-neutral/10 rounded-full h-10 w-10" />
          </div>
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
