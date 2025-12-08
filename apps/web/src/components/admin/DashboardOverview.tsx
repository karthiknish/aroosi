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
      <div className="bg-base-light rounded-lg shadow p-6 flex flex-col items-center">
        <div className="text-3xl font-bold text-primary">{totalPosts}</div>
        <div className="text-neutral-dark mt-2">Blog Posts</div>
      </div>
      <div className="bg-base-light rounded-lg shadow p-6 flex flex-col items-center">
        <div className="text-3xl font-bold text-primary">{totalMessages}</div>
        <div className="text-neutral-dark mt-2">Contact Messages</div>
      </div>
    </div>
  );
}
