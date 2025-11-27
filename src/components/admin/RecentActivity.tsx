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
        return { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" };
      case "match":
        return { icon: Heart, color: "text-pink-600", bg: "bg-pink-50" };
      case "message":
        return { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" };
      case "blog":
        return { icon: FileText, color: "text-teal-600", bg: "bg-teal-50" };
      case "approval":
        return { icon: CheckCircle2, color: "text-orange-600", bg: "bg-orange-50" };
      default:
        return { icon: AlertCircle, color: "text-slate-600", bg: "bg-slate-50" };
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
      approved: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
      rejected: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    };

    return (
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 ${variants[status as keyof typeof variants]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
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
    <Card className="border-slate-200 shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
          <p className="text-sm text-slate-500">Latest actions across the platform</p>
        </div>
        <Button variant="outline" size="sm" className="text-slate-600">
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {activityList.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
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
                      <p className="text-sm font-medium text-slate-900 truncate pr-2">
                        {activity.title}
                      </p>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {activity.user && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
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
                        <ExternalLink className="h-3 w-3 text-slate-400 hover:text-slate-600" />
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
