"use client";

import React, { useState, useMemo } from "react";
import { UsageTracker } from "@/components/usage/UsageTracker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useUnreadCounts } from "@/lib/hooks/useUnreadCounts";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Activity,
  TrendingUp,
  Calendar,
  MessageSquare,
  Search,
  Eye,
  Zap,
  Mic,
  Heart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UsageHistoryItem {
  feature: string;
  timestamp: number;
}

// shadcn chart config for consistent theming
const chartConfig: ChartConfig = {
  message_sent: { label: "Messages", color: "hsl(217.2 91.2% 59.8%)" },
  profile_view: { label: "Profile Views", color: "hsl(142.1 76.2% 36.3%)" },
  search_performed: { label: "Searches", color: "hsl(43.3 96.4% 56.3%)" },
  interest_sent: { label: "Interests", color: "hsl(330.4 81.2% 60.4%)" },
  profile_boost_used: { label: "Boosts", color: "hsl(262.1 83.3% 57.8%)" },
  voice_message_sent: { label: "Voice Messages", color: "hsl(238.7 83.5% 66.7%)" },
};

const FEATURE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  message_sent: { label: "Messages", icon: <MessageSquare className="h-4 w-4" />, color: "text-info" },
  profile_view: { label: "Profile Views", icon: <Eye className="h-4 w-4" />, color: "text-success" },
  search_performed: { label: "Searches", icon: <Search className="h-4 w-4" />, color: "text-warning" },
  interest_sent: { label: "Interests", icon: <Heart className="h-4 w-4" />, color: "text-primary" },
  profile_boost_used: { label: "Boosts", icon: <Zap className="h-4 w-4" />, color: "text-accent" },
  voice_message_sent: { label: "Voice Messages", icon: <Mic className="h-4 w-4" />, color: "text-secondary" },
};

export default function UsagePage() {
  useAuthContext();
  const { data: unreadCounts } = useUnreadCounts(undefined as any, undefined as any);

  // Fetch history
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const { getJson } = await import("@/lib/http/client");
      const json = await getJson<{ data: UsageHistoryItem[] }>(
        "/api/subscription/usage-history?days=30&limit=500", // Increased limit for better stats
        {
          cache: "no-store",
          headers: { "x-client-check": "usage-history" },
        }
      );
      return json.data;
    },
  });

  // Pagination state for table
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Process data
  const { chartData, stats, paginatedHistory, totalPages } = useMemo(() => {
    if (!history) return {
      chartData: { daily: [], distribution: [] },
      stats: { total: 0, topFeature: "-", activeDay: "-" },
      paginatedHistory: [],
      totalPages: 0
    };

    // 1. Stats & Charts Processing
    const dailyData: Record<string, Record<string, number>> = {};
    const featureCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};

    history.forEach((item) => {
      const date = new Date(item.timestamp);
      const dayStr = format(date, "MMM dd");

      // Daily Chart Data
      if (!dailyData[dayStr]) dailyData[dayStr] = {};
      dailyData[dayStr][item.feature] = (dailyData[dayStr][item.feature] || 0) + 1;

      // Feature Distribution
      featureCounts[item.feature] = (featureCounts[item.feature] || 0) + 1;

      // Activity per day (for "Most Active Day")
      dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
    });

    // Format for Recharts
    const daily = Object.entries(dailyData)
      .map(([date, features]) => ({ date, ...features }))
      .slice(-7); // Last 7 days for chart

    const distribution = Object.entries(featureCounts)
      .map(([feature, count]) => ({
        name: FEATURE_CONFIG[feature]?.label || feature,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate Top Stats
    const topFeatureEntry = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0];
    const topFeature = topFeatureEntry ? FEATURE_CONFIG[topFeatureEntry[0]]?.label || topFeatureEntry[0] : "-";

    const activeDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const activeDay = activeDayEntry ? activeDayEntry[0] : "-";

    // 2. Pagination
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const totalPages = Math.ceil(sortedHistory.length / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedHistory = sortedHistory.slice(start, start + pageSize);

    return {
      chartData: { daily, distribution },
      stats: {
        total: history.length,
        topFeature,
        activeDay
      },
      paginatedHistory,
      totalPages
    };
  }, [history, page]);

  return (
    <div className="min-h-screen bg-base-light pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-dark">Usage & Analytics</h1>
            <p className="text-neutral-light mt-1">Track your activity and plan usage limits.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-light bg-base-light px-3 py-1.5 rounded-full border shadow-sm">
            <Calendar className="h-4 w-4" />
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-neutral-light" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.total}</div>
              <p className="text-xs text-neutral-light">Recorded activities in period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Feature</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.topFeature}</div>
              <p className="text-xs text-neutral-light">Most frequently used</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
              <Calendar className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.activeDay}</div>
              <p className="text-xs text-neutral-light">Highest volume of activity</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tracker & Distribution */}
          <div className="space-y-8 lg:col-span-1">
            <UsageTracker />

            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>Breakdown by feature type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  {isLoading ? (
                    <div className="h-full w-full bg-neutral/10 animate-pulse rounded-lg" />
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <PieChart>
                        <Pie
                          data={chartData.distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {chartData.distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`var(--color-${Object.keys(chartConfig)[index % Object.keys(chartConfig).length]})`} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Trends & History */}
          <div className="space-y-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Trends</CardTitle>
                <CardDescription>Activity volume over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="h-full w-full bg-neutral/10 animate-pulse rounded-lg" />
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <BarChart data={chartData.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
                          className="text-muted-foreground text-xs"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          className="text-muted-foreground text-xs"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        {Object.keys(chartConfig).map((feature, index) => (
                          <Bar
                            key={feature}
                            dataKey={feature}
                            stackId="a"
                            fill={`var(--color-${feature})`}
                            radius={index === Object.keys(chartConfig).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Detailed history of your recent actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 w-24 bg-neutral/10 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-32 bg-neutral/10 rounded animate-pulse" /></TableCell>
                          <TableCell className="text-right"><div className="h-4 w-16 bg-neutral/10 rounded animate-pulse ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-neutral-light">
                          No activity recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedHistory.map((item, i) => {
                        const config = FEATURE_CONFIG[item.feature] || { label: item.feature, icon: <Activity className="h-4 w-4" />, color: "text-neutral-light" };
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-full bg-neutral/10 ${config.color}`}>
                                  {config.icon}
                                </div>
                                <span className="font-medium text-neutral-dark">{config.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-neutral-light">
                              {format(new Date(item.timestamp), "MMM d, yyyy • h:mm a")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                Completed
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-neutral-light">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
