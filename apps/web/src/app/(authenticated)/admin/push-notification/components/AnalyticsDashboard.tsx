import { Card, CardContent } from "@/components/ui/card";
import { Users, Smartphone, Send, BarChart3, ArrowUpRight } from "lucide-react";

interface AnalyticsData {
  totalDevices: number;
  activeDevices: number;
  iosDevices: number;
  androidDevices: number;
  webDevices: number;
  recentNotifications: number;
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="relative overflow-hidden border-0 shadow-md bg-base-light hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral">Total Devices</p>
              <p className="text-2xl font-bold text-neutral-dark">
                {analytics.totalDevices.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-info/10 rounded-xl">
              <Users className="h-5 w-5 text-info" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-neutral">
            <span className="flex items-center text-success font-medium mr-2">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +2.5%
            </span>
            <span>from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-md bg-base-light hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral">Active Devices</p>
              <p className="text-2xl font-bold text-neutral-dark">
                {analytics.activeDevices.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <Smartphone className="h-5 w-5 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-neutral">
             <div className="w-full bg-neutral/10 rounded-full h-1.5 mr-2">
                <div 
                  className="bg-success h-1.5 rounded-full" 
                  style={{ width: `${(analytics.activeDevices / Math.max(analytics.totalDevices, 1)) * 100}%` }}
                ></div>
             </div>
             <span>{((analytics.activeDevices / Math.max(analytics.totalDevices, 1)) * 100).toFixed(0)}%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-md bg-base-light hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
             <div className="space-y-1">
              <p className="text-sm font-medium text-neutral">Platform Split</p>
              <p className="text-2xl font-bold text-neutral-dark">
                {analytics.iosDevices + analytics.androidDevices + analytics.webDevices}
              </p>
            </div>
            <div className="p-3 bg-secondary/10 rounded-xl">
              <BarChart3 className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
             <div className="flex items-center gap-1 px-2 py-1 bg-neutral/5 rounded-md border border-neutral/10">
                <div className="w-2 h-2 bg-neutral-dark rounded-full"></div>
                <span className="font-medium">iOS {analytics.iosDevices}</span>
             </div>
             <div className="flex items-center gap-1 px-2 py-1 bg-neutral/5 rounded-md border border-neutral/10">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="font-medium">And {analytics.androidDevices}</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-md bg-base-light hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral">Recent Sends</p>
              <p className="text-2xl font-bold text-neutral-dark">
                {analytics.recentNotifications}
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <Send className="h-5 w-5 text-warning" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-neutral">
            <span className="flex items-center text-neutral font-medium mr-2">
              Last 7 days
            </span>
            <span>campaign activity</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
