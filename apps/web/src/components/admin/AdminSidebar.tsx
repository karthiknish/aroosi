"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
// import { useRouter } from "next/navigation";

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentPath: string;
}

export function AdminSidebar({
  collapsed,
  setCollapsed,
  currentPath,
}: AdminSidebarProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

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
    // Analytics tab removed until real dashboards are shipped
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
      icon: BarChart3, // Use Bell icon if available, fallback to BarChart3
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
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-neutral-dark/50 z-40 lg:hidden transition-opacity duration-300",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setCollapsed(true)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "bg-base-light border-r border-neutral/10 shadow-sm transition-all duration-300 flex flex-col",
          "fixed inset-y-0 left-0 z-50 h-full lg:relative",
          collapsed
            ? "-translate-x-full lg:translate-x-0 lg:w-16"
            : "translate-x-0 w-64"
        )}
      >
        {/* Logo Area */}
      <div className="p-6 border-b border-neutral/10">
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
              <p className="text-xs text-neutral-light">Admin Panel</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <div key={item.id} className="relative">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start transition-all duration-200 h-10",
                  item.isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-neutral-light hover:bg-neutral/5 hover:text-neutral-dark",
                  collapsed ? "px-2 justify-center" : "px-3"
                )}
                asChild
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                  {!collapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </Link>
              </Button>
              
              {/* Tooltip for collapsed state */}
              {collapsed && hoveredTab === item.id && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-neutral-dark text-base-light text-xs rounded shadow-lg z-50 whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-neutral/10">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full transition-all duration-200",
            collapsed ? "px-2 justify-center" : "justify-start px-3"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-3" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
    </>
  );
}