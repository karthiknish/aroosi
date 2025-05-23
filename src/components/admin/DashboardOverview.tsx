import { Card, CardContent } from "@/components/ui/card";
import { FileText, MessageSquare, Calendar } from "lucide-react";

interface DashboardOverviewProps {
  totalPosts: number;
  totalMessages: number;
}

export function DashboardOverview({
  totalPosts,
  totalMessages,
}: DashboardOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <div className="text-3xl font-bold text-pink-600">{totalPosts}</div>
        <div className="text-gray-700 mt-2">Blog Posts</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <div className="text-3xl font-bold text-pink-600">{totalMessages}</div>
        <div className="text-gray-700 mt-2">Contact Messages</div>
      </div>
    </div>
  );
}
