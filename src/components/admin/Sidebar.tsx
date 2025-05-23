"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  PlusCircle,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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
    <div className="w-64 bg-white border-r h-screen p-4">
      <div className="space-y-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              activeTab === tab.id && "bg-pink-50 text-pink-600"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
