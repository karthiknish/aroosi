"use client";

import React from "react";
import { UsageTracker } from "@/components/usage/UsageTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";
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
} from "recharts";

interface UsageHistoryItem {
  feature: string;
  timestamp: number;
}

export default function UsagePage() {
  useAuthContext(); // ensure auth order; no token usage

  // Detailed usage history (last 100 events)
  const { data: history } = useQuery({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const { getJson } = await import("@/lib/http/client");
      const json = await getJson<{ data: UsageHistoryItem[] }>(
        "/api/subscription/usage-history",
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Usage Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <UsageTracker />

        <Card>
          <CardHeader>
            <CardTitle>Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {Object.keys(featureNames).map((feature, index) => (
                <Bar
                  key={feature}
                  dataKey={feature}
                  fill={chartColors[index % chartColors.length]}
                  name={featureNames[feature]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}