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
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      isActive: currentPath.startsWith("/admin/analytics"),
    },
  ];

  return (
    <div
      className={cn(
        "bg-white border-r shadow-sm transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Area */}
      <div className="p-6 border-b">
        {collapsed ? (
          <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-600" />
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Aroosi</h2>
              <p className="text-xs text-gray-500">Admin Panel</p>
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
                    ? "bg-pink-50 text-pink-700 border-pink-200 border" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  collapsed ? "px-2 justify-center" : "px-3"
                )}
                asChild
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </Button>
              
              {/* Tooltip for collapsed state */}
              {collapsed && hoveredTab === item.id && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-50 whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t">
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
  );
}