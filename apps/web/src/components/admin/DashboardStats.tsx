"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
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
  href?: string;
}

function StatCard({ title, value, icon, description, trend, colorClass = "text-neutral", href }: StatCardProps) {
  const card = (
    <Card className="hover:shadow-md transition-all duration-200 border-neutral/10 overflow-hidden group h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-light">
          {title}
        </CardTitle>
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200",
          colorClass
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-neutral-dark">{value}</div>
          {trend && (
            <div className="flex items-center text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              {trend}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-neutral-light mt-1.5 flex items-center">
            <span className="w-1 h-1 rounded-full bg-neutral/30 mr-2" />
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
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
        {["stat-1", "stat-2", "stat-3", "stat-4", "stat-5", "stat-6", "stat-7", "stat-8"].map((key) => (
          <Card key={key} className="animate-pulse border-neutral/5">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-neutral/5 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-neutral/5 rounded w-16 mb-2"></div>
              <div className="h-3 bg-neutral/5 rounded w-32"></div>
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
    isApproximate: false,
    ...stats,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={defaultStats.totalUsers.toLocaleString()}
        icon={<Users className="h-5 w-5" />}
        description="Registered members"
        colorClass="text-info bg-info/10"
        href="/admin/profile"
      />
      
      <StatCard
        title="Active Users"
        value={defaultStats.activeUsers.toLocaleString()}
        icon={<Activity className="h-5 w-5" />}
        description="Last 30 days"
        colorClass="text-success bg-success/10"
      />
      
      <StatCard
        title="Total Matches"
        value={defaultStats.totalMatches.toLocaleString()}
        icon={<Heart className="h-5 w-5" />}
        description="Successful connections"
        colorClass="text-primary bg-primary/10"
        href="/admin/matches"
      />
      
      <StatCard
        title="Messages"
        value={defaultStats.messagesCount.toLocaleString()}
        icon={<MessageSquare className="h-5 w-5" />}
        description="Total exchanged"
        colorClass="text-secondary bg-secondary/10"
      />
      
      <StatCard
        title="New Registrations"
        value={defaultStats.newRegistrations.toLocaleString()}
        icon={<UserPlus className="h-5 w-5" />}
        description="This week"
        colorClass="text-secondary bg-secondary/10"
      />
      
      <StatCard
        title="Contact Messages"
        value={defaultStats.contactMessages.toLocaleString()}
        icon={<Mail className="h-5 w-5" />}
        description="Total contact submissions"
        colorClass="text-warning bg-warning/10"
        href="/admin/contact"
      />
      
      <StatCard
        title="Blog Posts"
        value={defaultStats.blogPosts.toLocaleString()}
        icon={<FileText className="h-5 w-5" />}
        description="Published articles"
        colorClass="text-info bg-info/10"
        href="/admin/blog"
      />
      
      <StatCard
        title="Pending Approvals"
        value={defaultStats.approvalsPending.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5" />}
        description="Profiles flagged for review"
        colorClass="text-danger bg-danger/10"
        href="/admin/profile"
      />
    </div>
  );
}
