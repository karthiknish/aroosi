"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  BarChart3,
  Shield,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: "create-blog",
      title: "Create Blog Post",
      description: "Write a new article",
      icon: <Plus className="h-4 w-4" />,
      href: "/admin/blog/create",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    },
    {
      id: "review-profiles",
      title: "Review Profiles",
      description: "Approve pending profiles",
      icon: <Shield className="h-4 w-4" />,
      href: "/admin/profile",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
    },
    {
      id: "view-messages",
      title: "Contact Messages",
      description: "Respond to user inquiries",
      icon: <Mail className="h-4 w-4" />,
      href: "/admin/contact",
      color: "bg-green-50 text-green-600 hover:bg-green-100",
    },
    {
      id: "user-management",
      title: "Manage Users",
      description: "Search and manage users",
      icon: <Search className="h-4 w-4" />,
      href: "/admin/profile",
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    },
    {
      id: "analytics",
      title: "View Analytics",
      description: "Platform insights",
      icon: <BarChart3 className="h-4 w-4" />,
      href: "/admin/analytics",
      color: "bg-pink-50 text-pink-600 hover:bg-pink-100",
    },
    {
      id: "settings",
      title: "Platform Settings",
      description: "Configure system",
      icon: <Settings className="h-4 w-4" />,
      href: "/admin/settings",
      color: "bg-gray-50 text-gray-600 hover:bg-gray-100",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className={`h-auto p-4 flex items-center justify-start space-x-3 transition-colors ${action.color}`}
              onClick={() => router.push(action.href)}
            >
              <div className="flex-shrink-0">
                {action.icon}
              </div>
              <div className="flex flex-col items-start space-y-1 min-w-0">
                <span className="font-medium text-sm">{action.title}</span>
                <span className="text-xs opacity-80 text-left">
                  {action.description}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}