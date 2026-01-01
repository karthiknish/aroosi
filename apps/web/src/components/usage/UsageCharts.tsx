"use client";

import React from "react";
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

interface UsageChartsProps {
  chartData: {
    daily: any[];
    distribution: any[];
  };
  chartConfig: ChartConfig;
}

export function UsageCharts({ chartData, chartConfig }: UsageChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-dark">Activity Distribution</h3>
        <div className="h-[250px] w-full">
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
                  <Cell
                    key={`cell-${index}`}
                    fill={`var(--color-${
                      Object.keys(chartConfig)[index % Object.keys(chartConfig).length]
                    })`}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-dark">Daily Activity Trends</h3>
        <div className="h-[300px] w-full">
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
        </div>
      </div>
    </div>
  );
}
