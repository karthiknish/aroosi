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
      colorClass: "bg-info/5 hover:bg-info/10 border-info/10",
      iconColor: "text-info",
    },
    {
      id: "review-profiles",
      title: "Review Profiles",
      description: "Approve pending profiles",
      icon: <Shield className="h-5 w-5" />,
      href: "/admin/profile",
      colorClass: "bg-warning/5 hover:bg-warning/10 border-warning/10",
      iconColor: "text-warning",
    },
    {
      id: "view-messages",
      title: "Contact Messages",
      description: "Respond to user inquiries",
      icon: <Mail className="h-5 w-5" />,
      href: "/admin/contact",
      colorClass: "bg-success/5 hover:bg-success/10 border-success/10",
      iconColor: "text-success",
    },
    {
      id: "user-management",
      title: "Manage Users",
      description: "Search and manage users",
      icon: <Search className="h-5 w-5" />,
      href: "/admin/profile",
      colorClass: "bg-secondary/5 hover:bg-secondary/10 border-secondary/10",
      iconColor: "text-secondary",
    },
    {
      id: "analytics",
      title: "View Analytics",
      description: "Platform insights",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/admin/analytics",
      colorClass: "bg-primary/5 hover:bg-primary/10 border-primary/10",
      iconColor: "text-primary",
    },
    {
      id: "marketing-email",
      title: "Send Marketing Email",
      description: "Promote to all users",
      icon: <Mail className="h-5 w-5" />,
      href: "/admin/marketing-email",
      colorClass: "bg-danger/5 hover:bg-danger/10 border-danger/10",
      iconColor: "text-danger",
    },
    {
      id: "push-notification",
      title: "Send Push Notification",
      description: "Notify all app users",
      icon: <Bell className="h-5 w-5" />,
      href: "/admin/push-notification",
      colorClass: "bg-warning/5 hover:bg-warning/10 border-warning/10",
      iconColor: "text-warning",
    },
    {
      id: "settings",
      title: "Platform Settings",
      description: "Configure system",
      icon: <Settings className="h-5 w-5" />,
      href: "/admin/settings",
      colorClass: "bg-neutral/5 hover:bg-neutral/10 border-neutral/10",
      iconColor: "text-neutral",
    },
  ];

  return (
    <Card className="border-neutral/10 shadow-sm h-full">
      <CardHeader className="border-b border-neutral/5 pb-4">
        <CardTitle className="text-lg font-semibold text-neutral-dark">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              onClick={() => router.push(action.href)}
              className={`group flex items-center justify-between w-full h-auto p-4 rounded-xl border transition-all duration-200 ${action.colorClass} hover:bg-transparent`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg bg-base-light/60 ${action.iconColor}`}>
                  {action.icon}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-neutral-dark text-sm">
                    {action.title}
                  </span>
                  <span className="text-xs text-neutral">
                    {action.description}
                  </span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${action.iconColor}`} />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
