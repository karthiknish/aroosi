"use client";

import React from "react";
import { UsageTracker } from "@/components/usage/UsageTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useUnreadCounts } from "@/lib/hooks/useUnreadCounts";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface UsageHistoryItem {
  feature: string;
  timestamp: number;
}

export default function UsagePage() {
  useAuthContext(); // ensure auth order; no token usage
  // Unread counts (aggregate) for display - safe even if undefined
  const { data: unreadCounts } = useUnreadCounts(
    undefined as any,
    undefined as any
  );

  // Detailed usage history (last 100 events)
  const {
    data: history,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const { getJson } = await import("@/lib/http/client");
      const json = await getJson<{ data: UsageHistoryItem[] }>(
        "/api/subscription/usage-history?days=7&limit=200",
        {
          cache: "no-store",
          headers: { "x-client-check": "usage-history" },
        }
      );
      return json.data;
    },
    enabled: true,
  });

  const chartColors = [
    "#EC4899", // pink
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // yellow
    "#8B5CF6", // purple
    "#EF4444", // red
  ];

  const featureNames: Record<string, string> = {
    message_sent: "Messages",
    profile_view: "Profile Views",
    search_performed: "Searches",
    interest_sent: "Interests",
    profile_boost_used: "Boosts",
    voice_message_sent: "Voice Messages",
  };

  // Transform history data for charts
  const chartData = React.useMemo(() => {
    if (!history) return { daily: [], distribution: [] };

    // Group by day for the last 7 days
    const dailyData: Record<string, Record<string, number>> = {};
    const featureCounts: Record<string, number> = {};

    history.forEach((item) => {
      const day = format(new Date(item.timestamp), "MMM dd");
      if (!dailyData[day]) {
        dailyData[day] = {};
      }
      if (!dailyData[day][item.feature]) {
        dailyData[day][item.feature] = 0;
      }
      dailyData[day][item.feature]++;

      // Count total by feature
      featureCounts[item.feature] = (featureCounts[item.feature] || 0) + 1;
    });

    // Convert to chart format
    const daily = Object.entries(dailyData).map(([date, features]) => ({
      date,
      ...features,
    }));

    const distribution = Object.entries(featureCounts).map(
      ([feature, count]) => ({
        name: featureNames[feature] || feature,
        value: count,
      })
    );

    return { daily, distribution };
  }, [history, featureNames]);

  return (
    <div className="w-full overflow-y-hidden bg-base-light pt-28 sm:pt-28 md:pt-34 pb-12 relative overflow-x-hidden">
      {/* Decorative color pop circles (match search page) */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-3xl font-bold mb-8">Usage Analytics</h1>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <UsageTracker />

          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100">
            <CardHeader>
              <CardTitle>Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] bg-gray-100 animate-pulse rounded" />
              ) : isError ? (
                <div className="text-sm text-red-600">
                  Failed to load usage data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent = 0 }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.distribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100">
          <CardHeader>
            <CardTitle>Daily Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] bg-gray-100 animate-pulse rounded" />
            ) : isError ? (
              <div className="text-sm text-red-600">
                Failed to load usage data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    wrapperStyle={{ zIndex: 30 }}
                  />
                  {Object.keys(featureNames).map((feature, index) => (
                    <Bar
                      key={feature}
                      dataKey={feature}
                      fill={chartColors[index % chartColors.length]}
                      name={featureNames[feature]}
                    />
                  ))}
                  <Legend verticalAlign="bottom" height={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Unread aggregate summary */}
        <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100">
          <CardHeader>
            <CardTitle>Unread Messages Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {unreadCounts ? (
              <div className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  Conversations with unread messages:{" "}
                  {
                    Object.values(unreadCounts).filter((v) => (v as number) > 0)
                      .length
                  }
                </span>
                <span className="text-xs text-gray-500">
                  Total unread messages (approx):{" "}
                  {Object.values(unreadCounts).reduce(
                    (a, b) => a + (b as number),
                    0
                  )}
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No unread message data available.
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Unread counts update automatically while you browse. Opening a
              conversation marks its messages as read.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}