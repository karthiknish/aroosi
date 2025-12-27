"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  BarChart3,
  Heart,
} from "lucide-react";
import React from "react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Home, LogOut } from "lucide-react";

interface AdminSidebarProps {
  currentPath: string;
}

export function AdminSidebar({
  currentPath,
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const { signOut } = useAuthContext();
  const collapsed = state === "collapsed";

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin",
      isActive: currentPath === "/admin",
    },
    {
      id: "profiles",
      label: "Profiles",
      icon: Users,
      href: "/admin/profile",
      isActive: currentPath.startsWith("/admin/profile"),
    },
    {
      id: "matches",
      label: "Matches",
      icon: Heart,
      href: "/admin/matches",
      isActive: currentPath.startsWith("/admin/matches"),
    },
    {
      id: "contact",
      label: "Contact",
      icon: Mail,
      href: "/admin/contact",
      isActive: currentPath.startsWith("/admin/contact"),
    },
    {
      id: "blog",
      label: "Blog",
      icon: FileText,
      href: "/admin/blog",
      isActive: currentPath.startsWith("/admin/blog"),
    },
    {
      id: "icebreakers",
      label: "Icebreakers",
      icon: FileText,
      href: "/admin/icebreakers",
      isActive: currentPath.startsWith("/admin/icebreakers"),
    },
    {
      id: "push",
      label: "Push Notifications",
      icon: BarChart3,
      href: "/admin/push-notification",
      isActive: currentPath === "/admin/push-notification",
    },
    {
      id: "marketing-email",
      label: "Email Marketing",
      icon: Mail,
      href: "/admin/marketing-email",
      isActive: currentPath.startsWith("/admin/marketing-email"),
    },
  ];

  return (
    <Sidebar collapsible="icon" className="h-screen">
      <SidebarHeader className="p-6 border-b border-neutral/10">
        {collapsed ? (
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark">Aroosi</h2>
              <p className="text-xs text-neutral-dark/60">Admin Panel</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.label}
                className={cn(
                  "transition-all duration-200 h-10",
                  item.isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-neutral-light hover:bg-neutral/5 hover:text-neutral-dark"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-neutral/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Back to Site"
              className="text-neutral-light hover:bg-neutral/5 hover:text-neutral-dark h-10"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Back to Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              tooltip="Logout"
              className="text-danger hover:bg-danger/5 hover:text-danger h-10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="mt-2 hidden md:flex justify-center">
            <SidebarTrigger className="h-9 w-9 hover:bg-neutral/5" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
