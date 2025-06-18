"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Heart,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Activity,
  Mail,
  FileText,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: "increase" | "decrease";
  };
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, change, icon, description }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-gray-400">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <div className="flex items-center mt-1">
            <Badge
              variant={change.type === "increase" ? "default" : "secondary"}
              className={`text-xs ${
                change.type === "increase"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {change.type === "increase" ? "+" : "-"}{change.value}
            </Badge>
            <span className="text-xs text-gray-500 ml-2">vs last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  stats?: {
    totalUsers: number;
    activeUsers: number;
    totalMatches: number;
    messagesCount: number;
    newRegistrations: number;
    contactMessages: number;
    blogPosts: number;
    approvalsPending: number;
  };
  loading?: boolean;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const defaultStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalMatches: 0,
    messagesCount: 0,
    newRegistrations: 0,
    contactMessages: 0,
    blogPosts: 0,
    approvalsPending: 0,
    ...stats,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Users"
        value={defaultStats.totalUsers.toLocaleString()}
        change={{ value: "12%", type: "increase" }}
        icon={<Users className="h-4 w-4" />}
        description="Registered members"
      />
      
      <StatCard
        title="Active Users"
        value={defaultStats.activeUsers.toLocaleString()}
        change={{ value: "8%", type: "increase" }}
        icon={<Activity className="h-4 w-4" />}
        description="Last 30 days"
      />
      
      <StatCard
        title="Total Matches"
        value={defaultStats.totalMatches.toLocaleString()}
        change={{ value: "23%", type: "increase" }}
        icon={<Heart className="h-4 w-4" />}
        description="Successful connections"
      />
      
      <StatCard
        title="Messages"
        value={defaultStats.messagesCount.toLocaleString()}
        change={{ value: "5%", type: "decrease" }}
        icon={<MessageSquare className="h-4 w-4" />}
        description="This month"
      />
      
      <StatCard
        title="New Registrations"
        value={defaultStats.newRegistrations.toLocaleString()}
        change={{ value: "18%", type: "increase" }}
        icon={<UserPlus className="h-4 w-4" />}
        description="This week"
      />
      
      <StatCard
        title="Contact Messages"
        value={defaultStats.contactMessages.toLocaleString()}
        icon={<Mail className="h-4 w-4" />}
        description="Pending responses"
      />
      
      <StatCard
        title="Blog Posts"
        value={defaultStats.blogPosts.toLocaleString()}
        icon={<FileText className="h-4 w-4" />}
        description="Published articles"
      />
      
      <StatCard
        title="Pending Approvals"
        value={defaultStats.approvalsPending.toLocaleString()}
        icon={<TrendingUp className="h-4 w-4" />}
        description="Profiles awaiting review"
      />
    </div>
  );
}