"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Heart,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Activity,
  Mail,
  FileText,
  ArrowUpRight,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: string;
  colorClass?: string;
}

function StatCard({ title, value, icon, description, trend, colorClass = "text-slate-600" }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-all duration-200 border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-slate-50 ${colorClass}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          {trend && (
            <div className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              {trend}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-slate-100">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-100 rounded w-16 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-32"></div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={defaultStats.totalUsers.toLocaleString()}
        icon={<Users className="h-4 w-4" />}
        description="Registered members"
        colorClass="text-blue-600 bg-blue-50"
      />
      
      <StatCard
        title="Active Users"
        value={defaultStats.activeUsers.toLocaleString()}
        icon={<Activity className="h-4 w-4" />}
        description="Last 30 days"
        colorClass="text-green-600 bg-green-50"
      />
      
      <StatCard
        title="Total Matches"
        value={defaultStats.totalMatches.toLocaleString()}
        icon={<Heart className="h-4 w-4" />}
        description="Successful connections"
        colorClass="text-pink-600 bg-pink-50"
      />
      
      <StatCard
        title="Messages"
        value={defaultStats.messagesCount.toLocaleString()}
        icon={<MessageSquare className="h-4 w-4" />}
        description="Total exchanged"
        colorClass="text-purple-600 bg-purple-50"
      />
      
      <StatCard
        title="New Registrations"
        value={defaultStats.newRegistrations.toLocaleString()}
        icon={<UserPlus className="h-4 w-4" />}
        description="This week"
        colorClass="text-indigo-600 bg-indigo-50"
      />
      
      <StatCard
        title="Contact Messages"
        value={defaultStats.contactMessages.toLocaleString()}
        icon={<Mail className="h-4 w-4" />}
        description="Pending responses"
        colorClass="text-orange-600 bg-orange-50"
      />
      
      <StatCard
        title="Blog Posts"
        value={defaultStats.blogPosts.toLocaleString()}
        icon={<FileText className="h-4 w-4" />}
        description="Published articles"
        colorClass="text-teal-600 bg-teal-50"
      />
      
      <StatCard
        title="Pending Approvals"
        value={defaultStats.approvalsPending.toLocaleString()}
        icon={<TrendingUp className="h-4 w-4" />}
        description="Profiles awaiting review"
        colorClass="text-red-600 bg-red-50"
      />
    </div>
  );
}
