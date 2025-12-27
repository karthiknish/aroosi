import React from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PushNotificationHeader() {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-8 bg-base-light rounded-2xl shadow-sm border border-neutral/20">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl">
            <Bell className="h-6 w-6 text-base-light" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">
              Push Notifications
            </h1>
            <p className="text-neutral">
              Manage and send push notifications to users
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="gap-2 px-3 py-1">
          <Bell className="h-3 w-3" />
          OneSignal
        </Badge>
        <div className="flex items-center gap-2 text-sm text-neutral">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          Service Active
        </div>
      </div>
    </div>
  );
}
