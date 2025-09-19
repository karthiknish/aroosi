import { Card, CardContent } from "@/components/ui/card";
import { Users, Smartphone, Send } from "lucide-react";

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
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Devices</p>
              <p className="text-3xl font-bold text-blue-900">
                {analytics.totalDevices.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600">Registered users</span>
              </div>
            </div>
            <div className="p-3 bg-blue-500 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Active Devices</p>
              <p className="text-3xl font-bold text-green-900">
                {analytics.activeDevices.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">
                  {((analytics.activeDevices / analytics.totalDevices) * 100 || 0).toFixed(1)}% active
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-500 rounded-xl">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
        <CardContent className="p-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">Platform Distribution</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">iOS</span>
                </div>
                <span className="text-sm font-bold text-purple-900">{analytics.iosDevices}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Android</span>
                </div>
                <span className="text-sm font-bold text-purple-900">{analytics.androidDevices}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Web</span>
                </div>
                <span className="text-sm font-bold text-purple-900">{analytics.webDevices}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Recent Sends</p>
              <p className="text-3xl font-bold text-orange-900">
                {analytics.recentNotifications}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Send className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-600">Last 7 days</span>
              </div>
            </div>
            <div className="p-3 bg-orange-500 rounded-xl">
              <Send className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
