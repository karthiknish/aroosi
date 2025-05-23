"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect } from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const tabs = [
    {
      id: "profiles",
      label: "Profiles",
      icon: Users,
    },
    {
      id: "contact",
      label: "Messages",
      icon: MessageSquare,
    },
    {
      id: "blog",
      label: "Blog Posts",
      icon: FileText,
    },
    {
      id: "create-post",
      label: "Create Post",
      icon: PlusCircle,
    },
  ];

  return (
    <div
      className={`bg-white border-r h-screen p-4 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}
    >
      <button
        className="mb-4 flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
      <div className="space-y-1 relative">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative">
            <Button
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start transition-all duration-300",
                activeTab === tab.id && "bg-pink-50 text-pink-600",
                collapsed ? "px-2 justify-center" : "px-4"
              )}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {!collapsed && tab.label}
            </Button>
            {collapsed && hoveredTab === tab.id && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-gray-900 text-white text-xs rounded shadow z-50 whitespace-nowrap pointer-events-none">
                {tab.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
