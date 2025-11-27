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
  Bell,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
  iconColor: string;
}

export function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: "create-blog",
      title: "Create Blog Post",
      description: "Write a new article",
      icon: <Plus className="h-5 w-5" />,
      href: "/admin/blog/create",
      colorClass: "bg-blue-50 hover:bg-blue-100 border-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "review-profiles",
      title: "Review Profiles",
      description: "Approve pending profiles",
      icon: <Shield className="h-5 w-5" />,
      href: "/admin/profile",
      colorClass: "bg-orange-50 hover:bg-orange-100 border-orange-100",
      iconColor: "text-orange-600",
    },
    {
      id: "view-messages",
      title: "Contact Messages",
      description: "Respond to user inquiries",
      icon: <Mail className="h-5 w-5" />,
      href: "/admin/contact",
      colorClass: "bg-green-50 hover:bg-green-100 border-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "user-management",
      title: "Manage Users",
      description: "Search and manage users",
      icon: <Search className="h-5 w-5" />,
      href: "/admin/profile",
      colorClass: "bg-purple-50 hover:bg-purple-100 border-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "analytics",
      title: "View Analytics",
      description: "Platform insights",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/admin/analytics",
      colorClass: "bg-pink-50 hover:bg-pink-100 border-pink-100",
      iconColor: "text-pink-600",
    },
    {
      id: "marketing-email",
      title: "Send Marketing Email",
      description: "Promote to all users",
      icon: <Mail className="h-5 w-5" />,
      href: "/admin/marketing-email",
      colorClass: "bg-red-50 hover:bg-red-100 border-red-100",
      iconColor: "text-red-600",
    },
    {
      id: "push-notification",
      title: "Send Push Notification",
      description: "Notify all app users",
      icon: <Bell className="h-5 w-5" />,
      href: "/admin/push-notification",
      colorClass: "bg-yellow-50 hover:bg-yellow-100 border-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      id: "settings",
      title: "Platform Settings",
      description: "Configure system",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings",
      colorClass: "bg-slate-50 hover:bg-slate-100 border-slate-100",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm h-full">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className={`group flex items-center justify-between w-full p-4 rounded-xl border transition-all duration-200 ${action.colorClass}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg bg-white/60 ${action.iconColor}`}>
                  {action.icon}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-slate-900 text-sm">
                    {action.title}
                  </span>
                  <span className="text-xs text-slate-600">
                    {action.description}
                  </span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${action.iconColor}`} />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
