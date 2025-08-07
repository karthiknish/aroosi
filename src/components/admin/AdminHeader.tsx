"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Search, Menu, User, Settings, LogOut, Home } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  currentPath: string;
}

export function AdminHeader({
  sidebarCollapsed,
  setSidebarCollapsed,
  currentPath,
}: AdminHeaderProps) {
  const { profile: rawProfile, signOut } = useAuthContext();
  const profile = rawProfile as { fullName?: string; email?: string } | null;
  const router = useRouter();

  const getPageTitle = (path: string) => {
    if (path === "/admin") return "Dashboard";
    if (path.startsWith("/admin/profile")) return "Profile Management";
    if (path.startsWith("/admin/blog")) return "Blog Management";
    if (path.startsWith("/admin/contact")) return "Contact Messages";
    if (path.startsWith("/admin/matches")) return "Match Management";
    if (path.startsWith("/admin/analytics")) return "Analytics";
    return "Admin Panel";
  };

  const getBreadcrumbs = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Admin", href: "/admin" }];

    if (segments.length > 1) {
      const currentPage = segments[segments.length - 1];
      const pageLabel =
        currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
      breadcrumbs.push({ label: pageLabel, href: path });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <header className="bg-white border-b shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Title and Breadcrumbs */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {getPageTitle(currentPath)}
            </h1>
            <nav className="flex items-center space-x-1 text-sm text-gray-500">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="hover:text-pink-600 transition-colors"
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Right side - Search and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10 w-80 bg-gray-50 border-0 focus:bg-white"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
          </Button>

          {/* User Menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-pink-100 text-pink-700">
                    {profile?.fullName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-0">
              <div className="flex items-center justify-start gap-2 p-3 border-b">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{profile?.fullName}</p>
                  <p className="w-[200px] truncate text-xs text-gray-500">
                    {profile?.email}
                  </p>
                </div>
              </div>
              <div className="py-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 h-auto"
                  onClick={() => router.push("/")}
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Back to Site</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 h-auto"
                  onClick={() => router.push("/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 h-auto"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Button>
                <div className="border-t mx-1 my-1"></div>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
