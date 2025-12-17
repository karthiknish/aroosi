"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Heart,
  MessageSquare,
  FileText,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";

// Helper function to format relative time
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${diffInDays}d ago`;
}

interface ActivityItem {
  id: string;
  type: "registration" | "match" | "message" | "blog" | "approval";
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  status?: "pending" | "approved" | "rejected";
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  const getActivityConfig = (type: ActivityItem["type"]) => {
    switch (type) {
      case "registration":
        return { icon: UserPlus, color: "text-info", bg: "bg-info/10" };
      case "match":
        return { icon: Heart, color: "text-primary", bg: "bg-primary/10" };
      case "message":
        return { icon: MessageSquare, color: "text-secondary", bg: "bg-secondary/10" };
      case "blog":
        return { icon: FileText, color: "text-success", bg: "bg-success/10" };
      case "approval":
        return { icon: CheckCircle2, color: "text-warning", bg: "bg-warning/10" };
      default:
        return { icon: AlertCircle, color: "text-neutral-light", bg: "bg-neutral/5" };
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants = {
      pending: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20",
      approved: "bg-success/10 text-success border-success/30 hover:bg-success/20",
      rejected: "bg-danger/10 text-danger border-danger/30 hover:bg-danger/20",
    };

    return (
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 ${variants[status as keyof typeof variants]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-neutral/10 shadow-sm">
        <CardHeader className="border-b border-neutral/5 pb-4">
          <CardTitle className="text-lg font-semibold text-neutral-dark">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-neutral/10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral/10 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral/10 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activityList = activities || [];

  return (
    <Card className="border-neutral/10 shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral/5 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-neutral-dark">Recent Activity</CardTitle>
          <p className="text-sm text-neutral-light">Latest actions across the platform</p>
        </div>
        <Button variant="outline" size="sm" className="text-neutral">
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {activityList.length === 0 ? (
          <div className="text-center py-12 text-neutral-light">
            <Clock className="h-12 w-12 mx-auto mb-3 text-neutral/30" />
            <p>No recent activity found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activityList.slice(0, 8).map((activity) => {
              const config = getActivityConfig(activity.type);
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex items-start space-x-4 group">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-neutral-dark truncate pr-2">
                        {activity.title}
                      </p>
                      <span className="text-xs text-neutral-light whitespace-nowrap">
                        {formatDistanceToNow(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-neutral mb-2 line-clamp-1">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {activity.user && (
                          <span className="text-xs font-medium text-neutral-light bg-neutral/5 px-2 py-0.5 rounded-full">
                            {activity.user.name}
                          </span>
                        )}
                        {getStatusBadge(activity.status)}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
                      >
                        <ExternalLink className="h-3 w-3 text-neutral-light hover:text-neutral" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
